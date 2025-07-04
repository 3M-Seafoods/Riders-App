let currentUser = null;
let supplierName = "";

auth.onAuthStateChanged(user => {
  if (!user) return location.href = "supplier-login.html";
  currentUser = user;

  db.ref(`users/${user.uid}`).once("value").then(snap => {
    const info = snap.val();
    if (!info || info.role !== "supplier") {
      alert("Unauthorized");
      auth.signOut();
    } else {
      supplierName = info.displayName || user.email;
      document.getElementById("logged-user").textContent = `Logged in as: ${supplierName}`;
      loadExpenses();
    }
  });
});

function logout() {
  auth.signOut().then(() => location.href = "supplier-login.html");
}

function submitExpense() {
  const name = document.getElementById("expense-name").value.trim();
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const date = document.getElementById("expense-date").value;

  if (!name || isNaN(amount) || !date) {
    alert("Please complete all fields.");
    return;
  }

  const expenseData = {
    name,
    amount,
    date,
    createdAt: new Date().toISOString(),
    createdBy: currentUser.uid,
    submittedBy: supplierName,
    from: "supplier"
  };

  db.ref("expenses").push(expenseData).then(() => {
    alert("Expense submitted.");
    document.getElementById("expense-name").value = "";
    document.getElementById("expense-amount").value = "";
    document.getElementById("expense-date").value = "";
    loadExpenses();
  });
}

function loadExpenses() {
  const list = document.getElementById("supplier-expense-list");

  db.ref("expenses")
    .once("value")
    .then(snapshot => {
      const data = snapshot.val() || {};

      const supplierExpenses = Object.values(data)
        .filter(e => e.createdBy === currentUser.uid)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
        .slice(0, 20); // show only 20 recent from *this* supplier

      const html = supplierExpenses.map(e => `
        <div class="expense-item">
          <strong>${e.name}</strong><br>
          Amount: ₱${parseFloat(e.amount).toFixed(2)}<br>
          Date: ${e.date}
        </div>
      `).join("");

      list.innerHTML = html || "<p>No submitted expenses yet.</p>";
    });
}


