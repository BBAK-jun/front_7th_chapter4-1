# Static Site Generation 비동기 I/O 최적화 가이드

## 개요

이 문서는 SSG(Static Site Generation) 빌드 중에 파일 I/O 작업을 최적화하는 방법을 다룹니다.
정적 사이트 생성 과정에서 수백 개의 HTML 파일을 디스크에 쓸 때, 동기 파일 I/O를 비동기로 전환하여 빌드 성능을 대폭 개선한 과정과 그 효과를 설명합니다.

## 핵심 개념

### Sync vs Async의 차이점

#### 1. 동기(Sync) 방식: 전체 프로세스 블로킹

```javascript
// 이전 코드 - 동기 방식
for (const product of products) {
  fs.mkdirSync(productDir);        // 👈 I/O 완료될 때까지 CPU도 대기
  fs.writeFileSync(filePath);      // 👈 I/O 완료될 때까지 CPU도 대기
}
```

**특징:**
- CPU가 디스크 I/O가 끝날 때까지 **아무것도 못함**
- 다른 작업 처리 불가
- 순차적으로만 실행

#### 2. 비동기(Async) 방식: 이벤트 루프 활용

```javascript
// 현재 코드 - 비동기 방식
await Promise.all(chunk.map(async (product) => {
  await fs.mkdir(productDir);      // 👈 I/O 대기 중 다른 작업 처리 가능
  await fs.writeFile(filePath);    // 👈 I/O 대기 중 다른 작업 처리 가능
}));
```

**특징:**
- I/O 대기 중에 **다른 제품의 I/O 작업도 동시에 진행**
- CPU는 I/O 대기 중에도 다른 작업 처리
- 병렬 처리 가능

## 성능 차이 비교

### 시나리오
- 제품 수: 100개
- 각 파일 쓰기 시간: 10ms

### Sync 방식 (순차 처리)

```
Product 1: mkdir(10ms) → write(10ms) ━━━━━━━━ 20ms
Product 2:                              mkdir(10ms) → write(10ms) ━━━━━━━━ 20ms
Product 3:                                                          mkdir(10ms) → write(10ms)
...
총 시간: 100 × 20ms = 2,000ms (2초)
```

### Async 방식 (청크 100개 병렬)

```
Product 1:   mkdir → write ━━━
Product 2:   mkdir → write ━━━
Product 3:   mkdir → write ━━━  } 100개가 동시에 I/O 진행
...
Product 100: mkdir → write ━━━

총 시간: ~20ms (가장 느린 작업 기준)
```

**성능 향상: 약 100배** (이론상 청크 크기만큼)

## 왜 `await`를 사용해도 병렬 처리가 되는가?

### 오해하기 쉬운 부분

```javascript
await fs.mkdir(productDir);
await fs.writeFile(filePath);
```

위 코드만 보면 순차적으로 실행되는 것처럼 보입니다.

### 실제 동작 원리

```javascript
Promise.all([
  async () => {
    await fs.mkdir(dir1);
    await fs.writeFile(file1);
  },  // 독립적 실행
  async () => {
    await fs.mkdir(dir2);
    await fs.writeFile(file2);
  },  // 독립적 실행
  async () => {
    await fs.mkdir(dir3);
    await fs.writeFile(file3);
  },  // 독립적 실행
]);
```

**핵심:**
- 각 async 함수 내부에서는 `await`가 순차적으로 실행됨
- 하지만 **100개의 async 함수가 동시에 실행**되고 있음
- Node.js 이벤트 루프가 I/O 작업을 동시에 여러 개 처리

**즉, 디렉토리 생성과 파일 쓰기는 각 제품마다 순차적이지만, 100개 제품의 (디렉토리 생성 + 파일 쓰기)가 동시에 진행됩니다!**

## SSG 빌드 프로세스에서의 적용

이 최적화는 다음과 같은 Static Site Generation 시나리오에 효과적입니다:

1. **대량의 정적 페이지 생성**: 제품 상세 페이지, 블로그 포스트 등 수백~수천 개의 HTML 파일 생성
2. **빌드 타임 최적화**: CI/CD 파이프라인에서 빌드 시간 단축
3. **개발 생산성 향상**: 로컬 개발 중 SSG 빌드 대기 시간 감소

### 적용 전후 비교 (실제 SSG 빌드)

```
동기 방식: 1000개 제품 페이지 생성 → 약 20초
비동기 방식 (청크 100): 1000개 제품 페이지 생성 → 약 2-3초
```

## 구현 코드

### 1. fs/promises 모듈 사용

```javascript
// Before
import fs from "fs";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(file, content);

// After
import fs from "fs/promises";
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(file, content);
```

### 2. 청크 단위 병렬 처리

```javascript
async function processInChunks(items, chunkSize, processFn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    console.log(
      `Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(items.length / chunkSize)} (${chunk.length} items)...`,
    );
    // 청크 내 모든 아이템을 병렬로 처리
    const chunkResults = await Promise.all(chunk.map(processFn));
    results.push(...chunkResults);
  }
  return results;
}
```

### 3. 실제 사용

```javascript
await processInChunks(productsToGenerate, 100, async (product) => {
  const productId = product.productId;

  try {
    const productResult = await render(`/product/${productId}/`);

    const productDir = path.resolve(__dirname, `../../dist/vanilla/product/${productId}`);
    await fs.mkdir(productDir, { recursive: true });

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
```

## 최적화 체크리스트

- [x] `fs` → `fs/promises` 모듈 변경
- [x] `fs.readFileSync` → `await fs.readFile`
- [x] `fs.writeFileSync` → `await fs.writeFile`
- [x] `fs.mkdirSync` → `await fs.mkdir`
- [x] 청크 단위 병렬 처리 구현 (Promise.all)
- [x] 적절한 청크 크기 설정 (100개)

## 주의사항

### 1. 메모리 사용량

청크 크기가 너무 크면 메모리 사용량이 급증할 수 있습니다.
- 권장: 50-200개 사이
- 시스템 리소스에 따라 조정 필요

### 2. 파일 시스템 제한

일부 운영체제는 동시 파일 핸들 수에 제한이 있습니다.
- macOS/Linux: ulimit 확인
- Windows: 일반적으로 문제 없음

### 3. 에러 핸들링

병렬 처리 시 에러가 발생해도 다른 작업은 계속 진행됩니다.
- 각 작업마다 try-catch 구현
- 실패한 작업 추적 및 로깅

## 성능 측정

```bash
# SSG 빌드 실행
pnpm run build:ssg

# 시간 측정 (Unix/Linux/macOS)
time pnpm run build:ssg
```

## 참고 자료

- [Node.js fs/promises API](https://nodejs.org/api/fs.html#promises-api)
- [Promise.all() MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [Node.js Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
