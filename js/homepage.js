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

async function renderPopularAlbum() {
  // 1) get most-added album
  const { data, error } = await sb
    .from("album_counts")
    .select("artist, title, entries")
    .order("entries", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error(error);
    return;
  }

  const albumTitle = data.title;
  const albumArtist = data.artist;
  const entryCount = data.entries;

  // 2) get all entries for that album
  const { data: rows, error: rowsError } = await sb
    .from("albums")
    .select("title, cover, spotify, ytmusic")
    .eq("title", albumTitle);

  if (rowsError || !rows?.length) {
    console.error(rowsError);
    return;
  }

  let cover, spotify, ytmusic;

  for (const r of rows) {
    cover ??= r.cover;
    spotify ??= r.spotify;
    ytmusic ??= r.ytmusic;
    if (cover && spotify && ytmusic) break;
  }

  console.log({
    albumTitle,
    entryCount,
    cover,
    spotify,
    ytmusic
  });

document.getElementById("most-popular-album-cover").src = cover;
document.getElementById("most-popular-album-name").textContent = albumTitle
document.getElementById("most-popular-album-artist").textContent = albumArtist
document.getElementById("most-popular-album-entry-count").textContent = entryCount + " Entries"

}

async function renderPopularArtist() {
  const { data, error } = await sb
    .from("artist_counts")
    .select("artist, entries")
    .order("entries", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error(error);
    return;
  }

  const artistName = data.artist;
  const entryCount = data.entries;

  console.log({
    artistName,
    entryCount
  });

  document.getElementById("most-popular-artist-name").textContent = artistName;
  document.getElementById("most-popular-artist-entry-count").textContent =
    entryCount + " Entries";
}








renderPopularAlbum()
renderPopularArtist()