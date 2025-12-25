// js/auth.js

async function signUp() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const username = document.getElementById("username").value.trim();

  if (!email || !password || !username) {
    alert("Fill all fields");
    return;
  }

  // 1. create auth user
  const { data, error } = await sb.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  // 2. create profile row
  const { error: profileError } = await sb
    .from("profiles")
    .insert({
      id: data.user.id,
      username
    });

  if (profileError) {
    alert(profileError.message);
    return;
  }

  // 3. redirect to their profile
  window.location.href = `profile.html?u=${encodeURIComponent(username)}`;
}

async function logIn() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Fill email and password");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  // get username for redirect
  const { data: profile } = await sb
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();

  window.location.href = `index.html`;
}

// wire buttons
document.getElementById("signup").onclick = signUp;
document.getElementById("login").onclick = logIn;
