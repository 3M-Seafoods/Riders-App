function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  if (!email || !password) {
    status.textContent = "⚠️ Please enter both email and password.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      const uid = cred.user.uid;
      return db.ref(`users/${uid}`).once("value");
    })
    .then(snapshot => {
      const userData = snapshot.val();
      if (!userData || userData.role !== "supplier") {
        auth.signOut();
        status.textContent = "⛔ Not authorized for Supplier App.";
      } else {
        localStorage.setItem("supplierName", userData.displayName || email);
        window.location.href = "supplier-main.html";
      }
    })
    .catch(error => {
      status.textContent = "❌ " + error.message;
    });
}
