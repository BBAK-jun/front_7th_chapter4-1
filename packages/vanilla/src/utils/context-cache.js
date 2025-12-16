/**
 * 컨텍스트 기반의 캐싱 유틸리티
 * @param {object} context - 요청 컨텍스트
 * @param {string} key - 캐시 키
 * @param {() => Promise<any>} fetcher - 데이터를 가져오는 함수
 * @returns {Promise<any>}
 */
export const withContextCache = async (context, key, fetcher) => {
  // 컨텍스트에 캐시 저장소가 없으면 초기화
  if (!context._cache) {
    context._cache = new Map();
  }

  // 이미 캐시된 항목이 있으면 반환
  if (context._cache.has(key)) {
    return context._cache.get(key);
  }

  // 프로미스를 실행하고 캐시에 저장
  // 프로미스 자체를 저장하여 동시 요청 시 중복 실행 방지
  const promise = fetcher().catch((err) => {
    // 에러 발생 시 캐시에서 제거하여 재시도 가능하게 함
    context._cache.delete(key);
    throw err;
  });

  context._cache.set(key, promise);

  return promise;
};
