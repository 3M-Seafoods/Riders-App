let allOrders = {};
let basePrices = {};

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "supplier-login.html";

  db.ref(`users/${user.uid}`).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "supplier") {
      alert("Unauthorized");
      auth.signOut();
    } else {
      document.getElementById("logged-user").textContent =
        "Logged in as: " + (data.displayName || user.email);
      loadBasePrices();
    }
  });
});

function logout() {
  auth.signOut().then(() => location.href = "supplier-login.html");
}

function loadBasePrices() {
  db.ref("basePrices").once("value").then(snapshot => {
    const raw = snapshot.val() || {};
    basePrices = {
      ...raw,
      shrimp200g: raw.shrimp200g ?? raw.shrimp200 ?? 0
    };
    loadAllOrders();
  });
}

function loadAllOrders() {
  db.ref("orders").once("value").then(snapshot => {
    allOrders = snapshot.val() || {};
    const userSet = new Set();

    Object.values(allOrders).forEach(order => {
      if (order.status === "delivered" || order.status === "received") {
        userSet.add(order.username);
      }
    });

    const userSelect = document.getElementById("userSelect");
    userSelect.innerHTML = '<option value="">--Select User--</option>';
    [...userSet].sort().forEach(user => {
      const opt = document.createElement("option");
      opt.value = user;
      opt.textContent = user;
      userSelect.appendChild(opt);
    });
  });
}

function loadDates() {
  const user = document.getElementById("userSelect").value;
  const dateSet = new Set();

  Object.values(allOrders).forEach(order => {
    if (
      (order.status === "delivered" || order.status === "received") &&
      order.username === user
    ) {
      dateSet.add(order.date);
    }
  });

  const dateSelect = document.getElementById("dateSelect");
  dateSelect.innerHTML = '<option value="">--Select Date--</option>';
  [...dateSet].sort().forEach(date => {
    const opt = document.createElement("option");
    opt.value = date;
    opt.textContent = date;
    dateSelect.appendChild(opt);
  });

  document.getElementById("history").innerHTML = "";
}

function loadOrderDetails() {
  const user = document.getElementById("userSelect").value;
  const date = document.getElementById("dateSelect").value;
  if (!user || !date) return;

  let html = `<h3>${user} - ${date}</h3>`;
  let found = false;

  Object.entries(allOrders).forEach(([orderId, order]) => {
    if (
      (order.status === "delivered" || order.status === "received") &&
      order.username === user &&
      order.date === date
    ) {
      found = true;
      let total = 0;
      html += `<ul>`;

      (order.items || []).forEach(item => {
        const itemName = item.item;
        const unitPrice = parseFloat(item.basePrice || 0); // ✅ use saved base price from order
        const rawQty = order.supplierAdjustedItems?.[itemName];
        const adjustedQty = parseFloat(rawQty !== undefined ? rawQty : item.qty || 0);
        const subtotal = adjustedQty * unitPrice;
        total += subtotal;

        html += `<li>${itemName}: ${adjustedQty.toFixed(2)} kg × ₱${unitPrice.toFixed(2)} = ₱${subtotal.toFixed(2)}</li>`;
      });

      html += `</ul><strong>Total Payable: ₱${total.toFixed(2)}</strong><hr/>`;
    }
  });

  document.getElementById("history").innerHTML =
    found ? html : "<p>No matching orders found.</p>";
}
