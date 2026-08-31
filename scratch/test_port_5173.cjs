async function checkServer() {
  try {
    const res = await fetch('http://localhost:5173/');
    console.log('Port 5173 status:', res.status, res.statusText);
  } catch (err) {
    console.log('Port 5173 unreachable:', err.message);
  }
}
checkServer();
