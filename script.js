// Supabase initialization
const supabaseUrl = "https://ejokvyxrkmndkaqchpst.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqb2t2eXhya21uZGthcWNocHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5MTQ2MzgsImV4cCI6MjA2NzQ5MDYzOH0.0NhqbkCcFDr9xCQoG_Bw6oofF3OzD73aEU2AckADXKI";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements
let map;
let authForm, authButton, toggleAuth, emailInput, passwordInput;
let logoutBtn;
let showPONFormBtn, showJBFormBtn, showFPFormBtn;
let ponFormContainer, jbFormContainer, fpFormContainer;
let cancelPONForm, cancelJBForm, cancelFPForm;
let ponForm, jbForm, fpForm;

// Initialize map
async function initMap() {
  var map = L.map('map').setView([0, 0], 2);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  await loadAssetLocations();
}

// Load asset locations and add markers
async function loadAssetLocations() {
  if (!map) {
    console.warn("Map is not initialized yet.");
    return;
  }

  // Clear existing markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  try {
    // Fetch PONs
    const { data: pons, error: ponError } = await supabase.from("pons").select("*");
    if (!ponError && pons) {
      pons.forEach(pon => {
        if (pon.latitude && pon.longitude) {
          const marker = L.marker([pon.latitude, pon.longitude])
            .addTo(map)
            .bindPopup(`<b>PON ID:</b> ${pon.pon_id}<br><b>Status:</b> ${pon.status}`);
          
          marker.on('click', () => {
            highlightTableRow(pon.pon_id, 'PON');
          });
        }
      });
    }

    // Fetch Junction Boxes
    const { data: junctionBoxes, error: jbError } = await supabase.from("junction_boxes").select("*");
    if (!jbError && junctionBoxes) {
      junctionBoxes.forEach(jb => {
        if (jb.latitude && jb.longitude) {
          const marker = L.marker([jb.latitude, jb.longitude], {
            icon: L.divIcon({className: 'custom-div-icon', html: `<div class="marker-cluster jb-marker">JB</div>`})
          })
            .addTo(map)
            .bindPopup(`<b>Junction Box ID:</b> ${jb.jb_id}<br><b>Splitter:</b> ${jb.splitter_type || 'None'}<br><b>Status:</b> ${jb.status}`);

          marker.on('click', () => {
            highlightTableRow(jb.jb_id, 'JB');
          });
        }
      });
    }

    // Fit map to bounds
    if (map.getBounds().isValid()) {
      map.fitBounds(map.getBounds(), { padding: [50, 50] });
    } else {
      // Default view if no markers
      map.setView([51.505, -0.09], 13);
    }

  } catch (error) {
    console.error("Error loading asset locations:", error);
  }
}

function highlightTableRow(id, type) {
  const rows = document.querySelectorAll("#assetList tr");
  rows.forEach(row => {
    const rowId = row.getAttribute('data-id');
    const rowType = row.getAttribute('data-type');
    
    if (rowId === id && rowType === type) {
      row.classList.add('bg-blue-50');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => row.classList.remove('bg-blue-50'), 1500);
    }
  });
}

// Load dashboard summaries
async function loadDashboardSummaries() {
  try {
    // Total PONs
    const { count: ponCount } = await supabase
      .from("pons")
      .select("*", { count: "exact", head: true });
    document.getElementById("totalPON").textContent = ponCount || 0;

    // Total Junction Boxes
    const { count: jbCount } = await supabase
      .from("junction_boxes")
      .select("*", { count: "exact", head: true });
    document.getElementById("totalJunctionBoxes").textContent = jbCount || 0;

    // Total Faceplates
    const { count: fpCount } = await supabase
      .from("faceplates")
      .select("*", { count: "exact", head: true });
    document.getElementById("totalFaceplates").textContent = fpCount || 0;

    // Active Assets (across all types)
    const { count: activePONs } = await supabase
      .from("pons")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active");
    const { count: activeJBs } = await supabase
      .from("junction_boxes")
      .select("*", { count: "exact", head: true })
      .eq("status", "Active");
    document.getElementById("assetsActive").textContent = (activePONs || 0) + (activeJBs || 0);

    // Faulty Assets (across all types)
    const { count: faultyPONs } = await supabase
      .from("pons")
      .select("*", { count: "exact", head: true })
      .eq("status", "Faulty");
    const { count: faultyJBs } = await supabase
      .from("junction_boxes")
      .select("*", { count: "exact", head: true })
      .eq("status", "Faulty");
    document.getElementById("assetsFaulty").textContent = (faultyPONs || 0) + (faultyJBs || 0);

  } catch (error) {
    console.error("Error loading dashboard summaries:", error);
  }
}

// Load recent assets for table
async function loadRecentAssets() {
  try {
    const assetList = document.getElementById("assetList");
    if (!assetList) return;

    // Clear existing rows
    assetList.innerHTML = '';

    // Fetch PONs
    const { data: pons } = await supabase.from("pons").select("*").order("created_at", { ascending: false }).limit(5);
    if (pons) {
      pons.forEach(pon => {
        const row = document.createElement("tr");
        row.setAttribute("data-id", pon.pon_id);
        row.setAttribute("data-type", "PON");
        
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${pon.pon_id}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">PON</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="status-badge status-${pon.status.toLowerCase()}">${pon.status}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${pon.latitude.toFixed(4)}, ${pon.longitude.toFixed(4)}</td>
        `;
        assetList.appendChild(row);
      });
    }

    // Fetch Junction Boxes
    const { data: junctionBoxes } = await supabase.from("junction_boxes").select("*").order("created_at", { ascending: false }).limit(5);
    if (junctionBoxes) {
      junctionBoxes.forEach(jb => {
        const row = document.createElement("tr");
        row.setAttribute("data-id", jb.jb_id);
        row.setAttribute("data-type", "JB");
        
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${jb.jb_id}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Junction Box</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="status-badge status-${jb.status.toLowerCase()}">${jb.status}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${jb.latitude.toFixed(4)}, ${jb.longitude.toFixed(4)}</td>
        `;
        assetList.appendChild(row);
      });
    }

  } catch (error) {
    console.error("Error loading recent assets:", error);
  }
}

// Initialize authentication form
function initAuthForm() {
  authForm = document.getElementById("authForm");
  authButton = document.getElementById("authButton");
  toggleAuth = document.getElementById("toggleAuth");
  emailInput = document.getElementById("email");
  passwordInput = document.getElementById("password");

  if (!authForm) return;

  let isLogin = true;

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
        // Add user to profiles table
        if (result.data.user) {
          await supabase.from("profiles").insert([{
            id: result.data.user.id,
            role: "technician" 
          }]);
        }
      }

      if (result.error) {
        if (loginError) {
        loginError.textContent = result.error.message;
        loginError.classList.remove('hidden');
      } else {
        alert(result.error.message);
      }
      return;
      } else {
         if (isLogin) {
        window.location.href = '/main.html';
      } else {
        
      }
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert("An error occurred. Please try again.");
    }
  });

  toggleAuth.addEventListener("click", () => {
    
  });
}

// Initialize main page functions
function initMainPage() {
  // Logout button
  logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = "/index.html";
      } catch (error) {
        console.error("Logout error:", error.message);
      }
    });
  }

  // Quick action buttons
  showPONFormBtn = document.getElementById("showPONFormBtn");
  showJBFormBtn = document.getElementById("showJBFormBtn");
  
  ponFormContainer = document.getElementById("ponFormContainer");
  jbFormContainer = document.getElementById("jbFormContainer");
  
  cancelPONForm = document.getElementById("cancelPONForm");
  cancelJBForm = document.getElementById("cancelJBForm");

  // Show PON form
  if (showPONFormBtn) {
    showPONFormBtn.addEventListener("click", () => {
      ponFormContainer.classList.remove("hidden");
      jbFormContainer.classList.add("hidden");
    });
  }

  // Show JB form
  if (showJBFormBtn) {
    showJBFormBtn.addEventListener("click", () => {
      jbFormContainer.classList.remove("hidden");
      ponFormContainer.classList.add("hidden");
    });
  }

  // Cancel PON form
  if (cancelPONForm) {
    cancelPONForm.addEventListener("click", () => {
      ponFormContainer.classList.add("hidden");
    });
  }

  // Cancel JB form
  if (cancelJBForm) {
    cancelJBForm.addEventListener("click", () => {
      jbFormContainer.classList.add("hidden");
    });
  }

  // PON form submission
  ponForm = document.getElementById("ponForm");
  if (ponForm) {
    ponForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const ponId = document.getElementById("ponId").value;
      const latitude = parseFloat(document.getElementById("ponLatitude").value);
      const longitude = parseFloat(document.getElementById("ponLongitude").value);
      const status = document.getElementById("ponStatus").value;

      try {
        const { error } = await supabase.from("pons").insert([{
          pon_id: ponId,
          latitude,
          longitude,
          status,
          created_by: (await supabase.auth.getUser()).data.user.id
        }]);

        if (error) throw error;

        alert("PON added successfully!");
        ponForm.reset();
        ponFormContainer.classList.add("hidden");
        
        // Refresh data
        loadDashboardSummaries();
        loadRecentAssets();
        loadAssetLocations();
      } catch (error) {
        console.error("Error adding PON:", error);
        alert("Failed to add PON: " + error.message);
      }
    });
  }

  // JB form submission
  jbForm = document.getElementById("jbForm");
  if (jbForm) {
    jbForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const jbId = document.getElementById("jbId").value;
      const latitude = parseFloat(document.getElementById("jbLatitude").value);
      const longitude = parseFloat(document.getElementById("jbLongitude").value);
      const status = document.getElementById("jbStatus").value;
      const splitterType = document.getElementById("jbSplitter").value;

      try {
        const { error } = await supabase.from("junction_boxes").insert([{
          jb_id: jbId,
          latitude,
          longitude,
          status,
          splitter_type: splitterType,
          created_by: (await supabase.auth.getUser()).data.user.id
        }]);

        if (error) throw error;

        alert("Junction Box added successfully!");
        jbForm.reset();
        jbFormContainer.classList.add("hidden");
        
        // Refresh data
        loadDashboardSummaries();
        loadRecentAssets();
        loadAssetLocations();
      } catch (error) {
        console.error("Error adding Junction Box:", error);
        alert("Failed to add Junction Box: " + error.message);
      }
    });
  }

  // Refresh map button
  const refreshMapBtn = document.getElementById("refreshMapBtn");
  if (refreshMapBtn) {
    refreshMapBtn.addEventListener("click", async () => {
      await loadAssetLocations();
      alert("Map refreshed successfully");
    });
  }
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (window.location.pathname.includes("main.html")) {
    if (!session) {
      window.location.href = "/index.html";
      return;
    }
    initMainPage();
    initMap();
    loadDashboardSummaries();
    loadRecentAssets();
  } else {
    initAuthForm();
  }
});
