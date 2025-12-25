function goToAccount(event) {
    event.preventDefault(); // stops page refresh

    const searchedUser = document.getElementById("searched-user").value.trim();

    if (!searchedUser) return;

    window.location.href = `profile.html?u=${encodeURIComponent(searchedUser)}`;
}

async function isLoggedIn() {
  const { data, error } = await sb.auth.getSession();
  if (error) {
    console.error(error);
    return false;
  }
  return !!data.session;
}

async function getUsername() {
  const { data: sessionData, error: sessionError } =
    await sb.auth.getSession();

  if (sessionError || !sessionData.session) {
    return null;
  }

  const userId = sessionData.session.user.id;

  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return profile.username;
}

async function logOut() {
  const { error } = await sb.auth.signOut();
  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "index.html";
}

document
  .getElementById("logout-link")
  .addEventListener("click", (e) => {
    e.preventDefault();
    logOut();
  });

async function updateAuthLinks() {
  if (await isLoggedIn()) {

    //document.getElementById("auth-link").style.display = "none";
    document.getElementById("guest-only").style.display = "none";
    document.getElementById("signed-in-only").style.display = "block";

    const username = await getUsername();
    document.getElementById("profile-link").href = `profile.html?u=${encodeURIComponent(username)}`;

    } else {
    document.getElementById("auth-link").style.display = "block";
    document.getElementById("logout-link").style.display = "none";
    document.getElementById("profile-link").style.display = "none";
    }
}

updateAuthLinks();

async function loadUserList() {
  const { data: profiles, error } = await sb
    .from("profiles")
    .select("username")
    .order("username", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const list = document.getElementById("user-list");
  list.innerHTML = "";

  for (const profile of profiles) {
    const li = document.createElement("li");
    const a = document.createElement("a");

    a.href = `profile.html?u=${encodeURIComponent(profile.username)}`;
    a.textContent = profile.username;

    li.appendChild(a);
    list.appendChild(li);
  }
}

loadUserList();
