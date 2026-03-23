const INDEXNOW_ENDPOINT = "https://www.bing.com/indexnow";
const HOST = "www.jolofera.com";
const KEY = "4c4ea7c6-9a91-49be-8fd0-2ca80a88d1f8";

const urls = [
  "https://www.jolofera.com/",
  "https://www.jolofera.com/salons",
  "https://www.jolofera.com/comment-ca-marche",
  "https://www.jolofera.com/faq",
  "https://www.jolofera.com/legal/conditions-utilisation",
  "https://www.jolofera.com/legal/confidentialite",
  "https://www.jolofera.com/legal/mentions-legales",
  "https://www.jolofera.com/legal/cgv"
];

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls
  })
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`IndexNow a echoue (${response.status}): ${body}`);
}

console.log(`IndexNow envoye pour ${urls.length} URL(s).`);
