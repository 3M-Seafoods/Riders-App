auth.onAuthStateChanged(user => {
  if (!user) return location.href = "supplier-login.html";

  db.ref(`users/${user.uid}`).once("value").then(snap => {
    const data = snap.val();
    if (!data || data.role !== "supplier") {
      alert("Unauthorized");
      auth.signOut();
    } else {
      document.getElementById("logged-user").textContent = "Logged in as: " + (data.displayName || user.email);
    }
  });
});

function logout() {
  auth.signOut().then(() => location.href = "supplier-login.html");
}
