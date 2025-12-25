async function loadAlbums() {
  const res = await fetch("albums.json");
  if (!res.ok) {
    throw new Error("Failed to load albums.json");
  }
  return res.json();
}

function makeAlbum(album) {
  const div = document.createElement("div");
  div.className = "album";

  div.innerHTML = `
    <img class="album-cover" src="${album.cover}" alt="${album.title}">
    <div class="overlay"  title="${album.title}">
      ${album.links?.spotify ? `
        <a href="${album.links.spotify}" target="_blank" rel="noopener">
          <img src="logos/spotify.svg" alt="">
        </a>` : ""}
      ${album.links?.ytMusic ? `
        <a href="${album.links.ytMusic}" target="_blank" rel="noopener">
          <img src="logos/ytmusic.svg" alt="">
        </a>` : ""}
    </div>
  `;

  return div;
}

(async () => {
  try {
    const albums = await loadAlbums();
    const grid = document.getElementById("grid");

    if (!grid) {
      console.error("No #grid element found");
      return;
    }

    albums.forEach(album => {
      grid.appendChild(makeAlbum(album));
    });

  } catch (err) {
    console.error(err);
  }
})();
