let supplierName = "";

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "supplier-login.html";

  db.ref(`users/${user.uid}`).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "supplier") {
      alert("Unauthorized");
      auth.signOut();
    } else {
      supplierName = data.displayName || user.email;
      document.getElementById("logged-user").textContent = "Logged in as: " + supplierName;
      loadCurrentPrices();
    }
  });
});

function loadCurrentPrices() {
  db.ref("basePrices").once("value").then(snapshot => {
    const data = snapshot.val() || {};
    document.getElementById("current-tanigue").textContent = data.tanigue ? `(₱${data.tanigue}/kg)` : "";
    document.getElementById("current-shrimp40g").textContent = data.shrimp40g ? `(₱${data.shrimp40g}/kg)` : "";
    document.getElementById("current-shrimp200").textContent = data.shrimp200 ? `(₱${data.shrimp200}/kg)` : "";
    document.getElementById("current-squidM").textContent = data.squidM ? `(₱${data.squidM}/kg)` : "";
    document.getElementById("current-squidCalamari").textContent = data.squidCalamari ? `(₱${data.squidCalamari}/kg)` : "";
  });
}

function submitPrices() {
  const tanigue = parseFloat(document.getElementById("tanigue").value);
  const shrimp40g = parseFloat(document.getElementById("shrimp40g").value);
  const shrimp200 = parseFloat(document.getElementById("shrimp200").value);
  const squidM = parseFloat(document.getElementById("squidM").value);
  const squidCalamari = parseFloat(document.getElementById("squidCalamari").value);

  const prices = {
    tanigue,
    shrimp40g,
    shrimp200,
    squidM,
    squidCalamari,
    supplier: supplierName,
    timestamp: Date.now()
  };

  const isInvalid = [tanigue, shrimp40g, shrimp200, squidM, squidCalamari].some(val => isNaN(val) || val < 1);
  if (isInvalid) {
    document.getElementById("status").textContent = "⚠️ All prices must be at least ₱1.";
    return;
  }

  db.ref("basePrices").set(prices).then(() => {
    document.getElementById("status").textContent = "✅ Prices submitted successfully.";
    loadCurrentPrices(); // Refresh after submit
  }).catch(err => {
    document.getElementById("status").textContent = "❌ " + err.message;
  });
}

function logout() {
  auth.signOut().then(() => location.href = "supplier-login.html");
}
