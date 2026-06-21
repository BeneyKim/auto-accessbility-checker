const THINQ_HOST = "my.lgthinq.com";

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/");
    const normalizedSegments = segments.map((seg, idx) => {
      if (!seg || idx === 1 || /^\d+$/.test(seg)) {
        return seg;
      }
      const knownPages = [
        "search", "subfoodlist", "adduserfood", "disclaimer",
        "energymonitoringuserguide", "productinfo", "sublist",
        "smartcare", "history"
      ];
      if (knownPages.includes(seg.toLowerCase())) {
        return seg;
      }
      if (seg.includes("_")) {
        // Keep screen IDs starting with 3 uppercase letters followed by underscore
        if (/^[A-Z]{3}_/.test(seg)) {
          return seg;
        }
      }
      if (/^[A-Za-z0-9\-_=]+$/.test(seg)) {
        return "*";
      }
      return seg;
    });
    parsed.pathname = normalizedSegments.join("/");
    return parsed.toString();
  } catch (e) {
    return url;
  }
}

const urlGaji = "https://my.lgthinq.com/GRM-20/ZDQwNTIzMTEtOTVjMy0xYjI0LWFmNjctNGNiY2U5ODdkZTI5/eyJpc0NoZWNrIjpmYWxzZSwiZm9vZFNlcU5vIjoiNTAwMjI1IiwiZm9vZEZpbGUiOiJodHRwcyUzQSUyRiUyRm9iamVjdGNvbnRlbnQubGd0aGlucS5jb20lMkYxZDFlYWQyNi0yYjc4LTRmMDUtYTc4Yy0zZmZjMjNiNTIwNDklM0ZoZG50cyUzRGV4cCUzRDE4MTIxNzUyNzV+aG1hYyUzRDEzOTUxZjFjZDEwMTAzOWFlY2NiZjhhOTU5NzYyYzFjMTA5MDRkNmI3M2RkMDQ0Yzc5ZDMzZWRiZTk4YWFjMDYiLCJmb29kTmFtZSI6IiVFRSU5OCVCOCVFQiVCMDAlOTUiLCJrZWVwUGxhY2UiOiJSIiwicmVtYWluUGVyaW9kIjoiMTLsn2wg7KeA64K5IiwicmVtYWluUGVyaW9kQ29sb3IiOiJyZ2JhKDE5NCwgMCwgMzQsIDEpIiwiZm9vZENvdW50IjoiMSIsInJlbWFpblBlcmlvZERheSI6Ii0xMiIsImN1c3RvbUZvb2RJbWFnZSI6Imh0dHBzOi8vb2JqZWN0Y29udGVudC5sZ3RoaW5xLmNvbS83NThkNGYzYi0yMDhkLTRkMTMtYTY4OC00MzMyODVhZWI3YjU/aG1hYz01ZTU5ZGU5MjIyMTUwMTc0ZDA1NDg0ZGFmN2ZhMWExMmUxNGYyZjYyNTEzYzU1ODB slagSlNslklshSlkdslKslkdkjslkdjfkjsdklfjklsdfsdjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfjslkdfj", "S1JfRk9PRF8wMDAwMQ==", "R1JNXzIwX0ZPRDAxX01haW4=", "dW5kZWZpbmVk", "dW5kZWZpbmVk", "dW5kZWZpbmVk", "dW5kZWZpbmVk", "NA==", "dW5kZWZpbmVk", "GRM_20_FOD02_EditFoodInfo", "001", "GRM-20";

const urlNormal = "https://my.lgthinq.com/GRM-20/ZDQwNTIzMTEtOTVjMy0xYjI0LWFmNjctNGNiY2U5ODdkZTI5/eyJpc0NoZWNrIjpmYWxzZSwiZm9vZEltYWdlIjoiaHR0cHMlM0ElMkYlMkZvYmplY3Rjb250ZW50LmxndGhpbnEuY29tJTJGMjNkMWQyNWItYWU0MC00YmQ0LWFhNmEtMTJjMjk0MTMwNDFhJTNGaZG50cyUzRGV4cCUzRDE4MTIxNzUyNjl+aG1hYyUzRDYwNjIwZTJhMzVkMjEyZTU3NmU1YmVkZjYwNzNkODMyNTZlODdjOWI2NjExMDhkY2RkM2NmYjUwNWNkNjA3N2UiLCJmb29kU2V0dXBUeXBlIjoiRGVmYXVsdCIsImZvb2ROYW1lIjoiJUVEJTk4JUI4JUVCJUIwJTk1IiwibW9kaWZ5QXV0aG9yaXR5IjoiTiIsImtlZXBFbmREYXRlIjoiMjAyNi0wNi0yMCJ9/dW5kZWZpbmVk/R1JNXzIwX0ZPRDA0X0FkZEZvb2Qvc3ViRm9vZExpc3Q=/S1JfMQ==/JUVDJTk1JUJDJUVDJUIxJTg0/dW5kZWZpbmVk/dW5kZWZpbmVk/Ng==/dW5kZWZpbmVk/GRM_20_FOD02_EditFoodInfo/001/GRM-20";

console.log("urlGaji normalized:", normalizeUrl(urlGaji));
console.log("urlNormal normalized:", normalizeUrl(urlNormal));
console.log("Equal:", normalizeUrl(urlGaji) === normalizeUrl(urlNormal));
