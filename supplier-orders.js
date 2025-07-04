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
    const prices = snapshot.val() || {};

    basePrices = {
      ...prices,
      shrimp200g: prices.shrimp200 || prices.shrimp200g || 0
    };

    loadTodaysOrders();
  });
}

function getTodayPH() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function loadTodaysOrders() {
  const today = getTodayPH();
  const selectedUser = document.getElementById("user-filter").value;
  const container = document.getElementById("orders-container");
  const userFilter = document.getElementById("user-filter");

  db.ref("orders").once("value").then(snapshot => {
    const orders = snapshot.val() || {};
    container.innerHTML = "";
    const userSet = new Set();
    let found = false;

    Object.entries(orders).forEach(([orderId, order]) => {
      if (order.date === today) {
        userSet.add(order.username);

        if (selectedUser === "all" || selectedUser === order.username) {
          found = true;

          const div = document.createElement("div");
          div.className = "order-card";
          div.style = "border:1px solid #ccc; padding:10px; margin:10px;";
          const adjustedItems = order.supplierAdjustedItems || {};

          let itemsHTML = "";
          let totalPayable = 0;

          order.items.forEach(it => {
            const itemName = it.item;
            const basePrice = parseFloat(basePrices[itemName]) || 0;
            const orderedQty = parseFloat(it.qty) || 0;
            const adjustedQty = adjustedItems[itemName] ?? orderedQty;
            const subtotal = adjustedQty * basePrice;
            totalPayable += subtotal;

            if (order.status === "pending") {
              itemsHTML += `
                <div style="margin-bottom: 10px;">
                  <strong>${itemName}</strong><br>
                  Unit Price: ₱${basePrice.toFixed(2)} per kg<br>
                  Ordered: ${orderedQty} kg<br>
                  <label>Available:
                    <input type="number" step="0.1" min="0"
                      value="${adjustedQty}"
                      data-order="${orderId}"
                      data-item="${itemName}"
                      data-price="${basePrice}"
                      oninput="updateSubtotal('${orderId}')">
                  </label>
                  <div class="subtotal" id="subtotal-${orderId}-${itemName}">
                    Subtotal: ₱${subtotal.toFixed(2)}
                  </div>
                </div>
              `;
            } else {
              itemsHTML += `
                <div style="margin-bottom: 5px; font-size: 14px;">
                  <strong>${itemName}</strong> — ${adjustedQty} kg at ₱${basePrice.toFixed(2)}<br>
                  <span class="subtotal" id="subtotal-${orderId}-${itemName}">
                    Subtotal: ₱${subtotal.toFixed(2)}
                  </span>
                </div>
              `;
            }
          });

          let buttonsHTML = "";
          if (order.status === "pending") {
            buttonsHTML = `<button onclick="markAsDelivered('${orderId}')">✅ Mark as For Delivery</button>`;
          } else if (order.status === "for delivery") {
            buttonsHTML = `
              <button disabled>✅ Sent</button>
              <button onclick="markAsTrulyDelivered('${orderId}')">📦 Mark as Delivered</button>
            `;
          } else if (order.status === "delivered") {
            buttonsHTML = `<button disabled>📦 Delivered</button>`;
          }

          const timeString = order.timestamp
            ? new Date(order.timestamp).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Manila"
              })
            : "";

          div.innerHTML = `
            <p><strong>User:</strong> ${order.username}</p>
            <p><strong>Date:</strong> ${order.date} ${timeString ? `(${timeString})` : ""}</p>
            <p><strong>Status:</strong> ${order.status}</p>
            ${itemsHTML}
            <div id="total-${orderId}" style="font-weight: bold; margin-top: 10px;">
              Total Payable: ₱${totalPayable.toFixed(2)}
            </div>
            <div style="margin-top: 10px;">
              ${buttonsHTML}
            </div>
          `;

          container.appendChild(div);
        }
      }
    });

    if (userFilter.options.length <= 1) {
      [...userSet].sort().forEach(username => {
        const opt = document.createElement("option");
        opt.value = username;
        opt.textContent = username;
        userFilter.appendChild(opt);
      });
    }

    if (!found) {
      container.innerHTML = "🕓 No orders found for selected user today.";
    }
  });
}

function updateSubtotal(orderId) {
  const inputs = document.querySelectorAll(`input[data-order="${orderId}"]`);
  let total = 0;

  inputs.forEach(input => {
    const item = input.dataset.item;
    const basePrice = parseFloat(input.dataset.price) || 0;
    const qty = parseFloat(input.value) || 0;
    const subtotal = qty * basePrice;
    total += subtotal;

    const subtotalDiv = document.getElementById(`subtotal-${orderId}-${item}`);
    if (subtotalDiv) {
      subtotalDiv.textContent = `Subtotal: ₱${subtotal.toFixed(2)}`;
    }
  });

  const totalDiv = document.getElementById(`total-${orderId}`);
  if (totalDiv) {
    totalDiv.textContent = `Total Payable: ₱${total.toFixed(2)}`;
  }
}

function markAsDelivered(orderId) {
  const inputs = document.querySelectorAll(`input[data-order="${orderId}"]`);
  const adjustedItems = {};

  inputs.forEach(input => {
    const itemName = input.dataset.item;
    const qty = parseFloat(input.value) || 0;
    adjustedItems[itemName] = qty;
  });

  db.ref(`orders/${orderId}`).update({
    supplierAdjustedItems: adjustedItems,
    status: "for delivery"
  }).then(() => {
    document.getElementById("status").textContent = "✅ Marked as for delivery!";
    loadTodaysOrders();
  }).catch(err => {
    document.getElementById("status").textContent = "❌ " + err.message;
  });
}

function markAsTrulyDelivered(orderId) {
  db.ref(`orders/${orderId}`).update({
    status: "delivered"
  }).then(() => {
    document.getElementById("status").textContent = "✅ Marked as delivered!";
    loadTodaysOrders();
  }).catch(err => {
    document.getElementById("status").textContent = "❌ " + err.message;
  });
}
