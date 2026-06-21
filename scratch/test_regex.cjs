function isUrlInProductRoute(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'my.lgthinq.com' && /\/[A-Za-z0-9_-]+\/[A-Za-z0-9_=-]+\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

const url = "https://my.lgthinq.com/GWP/dW5kZWZpbmVk/NA==/dW5kZWZpbmVk/GWM_Favorite_Course_Management_Screen/001";
console.log("Matches isUrlInProductRoute:", isUrlInProductRoute(url));
