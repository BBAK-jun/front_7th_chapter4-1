import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to process products in chunks
async function processInChunks(items, chunkSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    console.log(
      `Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(items.length / chunkSize)} (${chunk.length} items)...`,
    );
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);
  }
  return results;
}

async function generateStaticSite() {
  try {
    // Start MSW server for API mocking
    const { server } = await import("./src/mocks/server.js");
    server.listen({ onUnhandledRequest: "bypass" });
    console.log("MSW server started for SSG");

    // Import the built server entry
    const { render } = await import("./dist/vanilla-ssr/entry-server.js");

    // Read HTML template from dist
    const templatePath = path.resolve(__dirname, "../../dist/vanilla/index.html");
    const originalTemplate = await fs.readFile(templatePath, "utf-8");

    console.log("Generating static site...");

    // Generate home page
    const homeResult = await render("/");
    let homeHtml = originalTemplate
      .replace("<!--app-head-->", homeResult.head)
      .replace("<!--app-html-->", homeResult.body);
    if (homeResult.initialScript) {
      homeHtml = homeHtml.replace("</head>", `${homeResult.initialScript}\n  </head>`);
    }
    await fs.writeFile(templatePath, homeHtml);
    console.log("✓ Generated static site for home page");

    // Get all products from mock data
    const items = await import("./src/mocks/items.json", { with: { type: "json" } });
    const allProducts = items.default;

    // Generate all products
    const productsToGenerate = allProducts;

    console.log(`Generating ${productsToGenerate.length} product pages in chunks of 100...`);

    // Process products in chunks of 100 with parallel processing
    await processInChunks(productsToGenerate, 100, async (product) => {
      const productId = product.productId;

      try {
        const productResult = await render(`/product/${productId}/`);

        // Create product directory
        const productDir = path.resolve(__dirname, `../../dist/vanilla/product/${productId}`);
        await fs.mkdir(productDir, { recursive: true });

        // Use FRESH template for each product (not the modified home template)
        let productHtml = originalTemplate
          .replace("<!--app-head-->", productResult.head)
          .replace("<!--app-html-->", productResult.body);
        if (productResult.initialScript) {
          productHtml = productHtml.replace("</head>", `${productResult.initialScript}\n  </head>`);
        }

        await fs.writeFile(path.join(productDir, "index.html"), productHtml);
        return { productId, success: true };
      } catch (error) {
        console.error(`Failed to generate product ${productId}:`, error.message);
        return { productId, success: false, error: error.message };
      }
    });

    console.log(`✓ Generated static site for ${productsToGenerate.length} products`);

    // Stop MSW server
    server.close();
  } catch (error) {
    console.error("Error generating static site:", error);
    process.exit(1);
  }
}

// Run
generateStaticSite();
