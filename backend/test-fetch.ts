import * as dotenv from 'dotenv';
dotenv.config();

async function testFetch() {
  try {
    const targetUrl = 'https://ca507483bf8509790ce6eda83312d514.r2.cloudflarestorage.com/luminia-masters/2021410f-8dbe-42fc-a125-1bcefcd24510/1785655549767-Gemini_Generated_Image_4zivli4zivli4ziv.png';
    const proxyUrl = `http://localhost:5000/api/v1/upload/view-by-url?url=${encodeURIComponent(targetUrl)}`;
    
    console.log(`Fetching from proxy: ${proxyUrl}`);
    const res = await fetch(proxyUrl);
    
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    console.log(`Content-Length: ${res.headers.get('content-length')}`);
    console.log(`Final URL: ${res.url}`);
    
    if (res.status !== 200) {
      console.log('Error text:', await res.text());
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testFetch();
