const url = process.argv[2] ?? 'https://medfit-pro.vercel.app/api/health';

fetch(url)
  .then(async (response) => {
    console.log('URL:', url);
    console.log('Status:', response.status);
    console.log(await response.text());
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
