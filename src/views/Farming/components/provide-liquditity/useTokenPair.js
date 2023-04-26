export function useTokenPair() {
  function getTokenLogo(tokenInfo, token) {
    return tokenInfo[token]?.logoURI;
  }

  return {
    getTokenLogo
  }
}
