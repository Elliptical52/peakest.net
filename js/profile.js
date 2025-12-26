// js/profile.js

const username = new URLSearchParams(location.search).get("u");
const grid = document.getElementById("grid");
const form = document.getElementById("add-album-form");

let editingAlbum = null;
let currentProfile = null;
let currentSession = null;

/* =========================
   Load profile + albums
   ========================= */

async function loadProfile() {
  if (!username) {
    document.body.textContent = "No user specified.";
    return;
  }

  // 1) get session
  const { data: sessionData, error: sessionErr } = await sb.auth.getSession();
  if (sessionErr) console.error(sessionErr);
  currentSession = sessionData?.session ?? null;

  const isAdmin =
    !!currentSession &&
    (
      currentSession.user.email === "tommartin2085@gmail.com"
    );

  // 2) fetch profile
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();


  if (profileError || !profile) {
    document.body.textContent = "User not found.";
    return;
  }

  currentProfile = profile;

  const badgeContainer = document.getElementById("badge-container");
  if (badgeContainer) {

    const { data: badges, error: badgeError } = await sb
      .from("badges")
      .select("id, label, color, text_color")
      .eq("user_id", profile.id);
    
    
    if (badgeError) {
      console.error("Failed to load badges:", badgeError);
    } else {
      badges.forEach(badge => {
        const h2 = document.createElement("h2");
        h2.classList.add("badge");

        h2.textContent = badge.label;
        h2.style.backgroundColor = badge.color;
        h2.style.color = badge.text_color;


        badgeContainer.appendChild(h2);
      });
    }
  }


  // 3) ownership
  const isOwner =
    !!currentSession &&
    (currentSession.user.id === profile.id);

  document.getElementById("user-title").textContent = username + "'s albums"
  document.getElementById("badge-title").textContent = username + "'s badges"



  // 4) show / hide add form
  if (form) {
    form.style.display = isOwner ? "block" : "none";
  }

  // 5) fetch albums
  const { data: albums, error: albumError } = await sb
    .from("albums")
    .select("*")
    .eq("user_id", profile.id);

  if (albumError) {
    console.error(albumError);
    document.body.textContent = "Failed to load albums.";
    return;
  }

  renderAlbums(albums, isOwner);
}

/* =========================
   Render albums
   ========================= */

function renderAlbums(albums, isOwner) {
  grid.innerHTML = "";

  for (const album of albums) {
    const div = document.createElement("div");
    div.className = "album";
    div.title = album.artist + " - " + album.title;

div.innerHTML = `
  <img class="album-cover" src="${album.cover}" alt="${album.title}">
  <div class="overlay">
    ${album.spotify ? `
      <a href="${album.spotify}" target="_blank" rel="noopener">
        <img src="logos/spotify.svg" alt="">
      </a>` : ""}
    ${album.ytmusic ? `
      <a href="${album.ytmusic}" target="_blank" rel="noopener">
        <img src="logos/ytmusic.svg" alt="">
      </a>` : ""}
    ${isOwner ? `
      <button class="edit-btn" data-id="${album.id}">✎</button>
      <button class="delete-btn" data-id="${album.id}">✕</button>
    ` : ""}
  </div>
`;


    grid.appendChild(div);
  }
}

/* =========================
   Add album (owner only)
   ========================= */

if (form && !form.dataset.wired) {
  form.dataset.wired = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentSession || !currentProfile) return;

    const title = document.getElementById("album-title").value.trim();
    const cover = document.getElementById("album-cover").value.trim();
    const spotify = document.getElementById("album-spotify").value.trim();
    const ytmusic = document.getElementById("album-ytmusic").value.trim();

    if (!title || !cover) {
      alert("Title and cover URL required");
      return;
    }

    const { error } = await sb.from("albums").insert({
      user_id: currentProfile.id,
      title,
      cover,
      spotify: spotify || null,
      ytmusic: ytmusic || null
    });

    if (error) {
      alert(error.message);
      return;
    }

    form.reset();
    loadProfile();
  });
}

/* =========================
   Delete album (owner only)
   ========================= */

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;

  if (!currentSession) return;

  const albumId = btn.dataset.id;
  if (!albumId) return;

  if (!confirm("Delete this album?")) return;

  const { error } = await sb
    .from("albums")
    .delete()
    .eq("id", albumId);

  if (error) {
    alert(error.message);
    return;
  }

  loadProfile();
});


loadProfile();


async function searchAlbums(query) {
  const url =
    "https://musicbrainz.org/ws/2/release-group" +
    `?query=${encodeURIComponent(query)}` +
    "&type=album" +
    "&inc=url-rels" +
    "&fmt=json";

  const res = await fetch(url);
  const data = await res.json();
  return data["release-groups"];
}

function extractLinks(album) {
  let spotify = null;
  let ytMusic = null;

  if (!album.relations) return { spotify, ytMusic };

  for (const rel of album.relations) {
    const url = rel.url?.resource;
    if (!url) continue;

    if (url.includes("spotify.com/album")) {
      spotify = url;
    }

    if (
      url.includes("music.youtube.com") ||
      url.includes("youtube.com/playlist")
    ) {
      ytMusic = url;
    }
  }

  return { spotify, ytMusic };
}
async function fetchAlbumDetails(mbid) {
  const url =
    `https://musicbrainz.org/ws/2/release-group/${mbid}` +
    "?inc=url-rels&fmt=json";

  const res = await fetch(url);
  return await res.json();
}
function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function renderSearchResults(albums) {
  const results = document.getElementById("search-results");
  results.innerHTML = "";

  for (const album of albums.slice(0, 5)) {
    const div = document.createElement("div");
    div.className = "search-result";

    const artist =
      album["artist-credit"]?.[0]?.name || "Unknown";

    div.textContent = `${album.title} — ${artist}`;

    // 👇 make it clickable
    div.addEventListener("click", () => {
      selectAlbum(album);
    });

    results.appendChild(div);
  }
}
async function selectAlbum(album) {
  // fetch full data WITH relations
  const fullAlbum = await fetchAlbumDetails(album.id);

  const { spotify, ytMusic } = extractLinks(fullAlbum);

  document.getElementById("album-title").value = album.title;
  document.getElementById("album-cover").value =
    `https://coverartarchive.org/release-group/${album.id}/front`;

  document.getElementById("album-spotify").value = spotify || "";
  document.getElementById("album-ytmusic").value = ytMusic || "";

  document.getElementById("search-results").innerHTML = "";
}


const input = document.getElementById("album-search");
const results = document.getElementById("search-results");

const debouncedSearch = debounce(async () => {
  const query = input.value.trim();

  if (query.length < 2) {
    results.innerHTML = "";
    return;
  }

  const albums = await searchAlbums(query);
  renderSearchResults(albums);
}, 300);

input.addEventListener("input", debouncedSearch);

document
  .getElementById("search-results")
  .addEventListener("click", (e) => {
    const item = e.target.closest(".search-result");
    if (!item) return;

    const album = JSON.parse(item.dataset.album);
    selectAlbum(album);
  });
grid.addEventListener("click", async (e) => {
  const editBtn = e.target.closest(".edit-btn");
  if (!editBtn) return;

  const albumId = editBtn.dataset.id;

  const { data: album, error } = await sb
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  editingAlbum = album;

  // Show edit panel
  document.getElementById("add-album-form").style.display = "block";
  document.getElementById("edit-panel").style.display = "block";

  // Load current data
  document.getElementById("edit-album-title").value = album.title || "";
  document.getElementById("edit-album-cover").value = album.cover || "";
  document.getElementById("edit-album-spotify").value = album.spotify || "";
  document.getElementById("edit-album-ytmusic").value = album.ytmusic || "";
});

document.getElementById("cancel-edit").addEventListener("click", (e) => {
  e.preventDefault();

  editingAlbum = null;
  document.getElementById("edit-panel").style.display = "none";
  document.getElementById("add-album-form").style.display = "none";
});

document.getElementById("save-edit").addEventListener("click", async (e) => {
  e.preventDefault();
  if (!editingAlbum) return;

  const updated = {
    title: document.getElementById("edit-album-title").value,
    cover: document.getElementById("edit-album-cover").value,
    spotify: document.getElementById("edit-album-spotify").value || null,
    ytmusic: document.getElementById("edit-album-ytmusic").value || null,
  };

  const { error } = await sb
    .from("albums")
    .update(updated)
    .eq("id", editingAlbum.id);

  if (error) {
    console.error(error);
    return;
  }

  // Close panel
  editingAlbum = null;
  document.getElementById("edit-panel").style.display = "none";
  document.getElementById("add-album-form").style.display = "none";

  grid.innerHTML = "";
  loadProfile();
});
