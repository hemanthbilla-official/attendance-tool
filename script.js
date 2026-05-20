// DOM Elements
const masterInput = document.getElementById("masterInput");
const shorthandInput = document.getElementById("shorthandInput");
const statusPanel = document.getElementById("statusPanel");
const verificationPanel = document.getElementById("verificationPanel");
const resultOutput = document.getElementById("resultOutput");
const masterCountLabel = document.getElementById("masterCount");
const presentCountLabel = document.getElementById("presentCount");
const absentCountLabel = document.getElementById("absentCount");
const copyBtn = document.getElementById("copyBtn");
const detectedCountLabel = document.getElementById("detectedCount");
const sectionDropdown = document.getElementById("sectionDropdown");

// Attendance data cache
let attendanceData = null;

// Load sections from JSON on page load
async function loadSections() {
  try {
    const response = await fetch("Attendance_List.json");
    const data = await response.json();
    attendanceData = data.attendance;

    Object.keys(attendanceData).forEach((section) => {
      const option = document.createElement("option");
      option.value = section;
      option.textContent = `Section ${section} (${attendanceData[section].length} students)`;
      sectionDropdown.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load Attendance_List.json:", error);
    sectionDropdown.innerHTML =
      '<option value="">Error loading sections</option>';
  }
}

// Handle section selection
sectionDropdown.addEventListener("change", () => {
  const selectedSection = sectionDropdown.value;
  if (!selectedSection || !attendanceData) return;

  const ids = attendanceData[selectedSection];
  masterInput.value = ids.join("\n");
  updateMasterCount();

  if (shorthandInput.value.trim()) {
    processAttendance();
  }
});

loadSections();

// Event Listeners
masterInput.addEventListener("input", () => {
  updateMasterCount();
});

shorthandInput.addEventListener("paste", () => {
  setTimeout(() => processAttendance(), 0);
});

shorthandInput.addEventListener("input", () => {
  processAttendance();
});

// Functions

function clearCurrentMaster() {
  masterInput.value = "";
  shorthandInput.value = "";
  verificationPanel.innerHTML =
    '<span class="text-slate-400 text-sm italic">Verification will appear here...</span>';
  resultOutput.value = "";
  sectionDropdown.value = "";
  statusPanel.innerHTML =
    '<span class="text-slate-400 text-sm italic">Status will appear here...</span>';
  updateMasterCount();
  updateCounts(0, 0);
  detectedCountLabel.textContent = "";
}

function updateMasterCount() {
  const count = masterInput.value
    .split("\n")
    .filter((line) => line.trim() !== "").length;
  masterCountLabel.textContent = `${count} IDs loaded`;
}

function updateCounts(present, absent) {
  presentCountLabel.textContent = `P: ${present}`;
  absentCountLabel.textContent = `A: ${absent}`;
}

function processAttendance() {
  // 1. Parse Master List
  const masterLines = masterInput.value
    .split(/[\n,]+/)
    .map((l) => l.trim())
    .filter((l) => l !== "");

  if (masterLines.length === 0) {
    masterInput.focus();
    masterInput.classList.add("ring-2", "ring-red-400");
    setTimeout(
      () => masterInput.classList.remove("ring-2", "ring-red-400"),
      1500,
    );
    return;
  }

  // Build master last-4 set for status lookup
  const masterLast4Set = new Set(
    masterLines.map((id) => (id.length >= 4 ? id.slice(-4) : id)),
  );

  // 2. Parse Shorthand Input
  const tokens = shorthandInput.value.split(/[\n,\t\s]+/);
  const presentSet = new Set();
  let validTokensFound = 0;

  // Clear and rebuild status panel
  statusPanel.innerHTML = "";

  tokens.forEach((token) => {
    let cleanToken = token.trim().replace(/['"]/g, "");
    if (!cleanToken) return;

    let padded = null;

    if (/^\d+$/.test(cleanToken)) {
      padded = cleanToken.padStart(4, "0").slice(-4);
      presentSet.add(padded);
      validTokensFound++;
    } else if (cleanToken.length >= 4) {
      padded = cleanToken.slice(-4);
      presentSet.add(padded);
      validTokensFound++;
    }

    // Add status line to panel
    if (padded !== null) {
      const isAvailable = masterLast4Set.has(padded);
      const line = document.createElement("div");
      line.className = "status-line";
      line.innerHTML = `<span class="num">${cleanToken}</span><span class="tag ${isAvailable ? "available" : "not-found"}">${isAvailable ? "Available" : "Not Found"}</span>`;
      statusPanel.appendChild(line);
    }
  });

  if (validTokensFound === 0) {
    statusPanel.innerHTML =
      '<span class="text-slate-400 text-sm italic">Status will appear here...</span>';
  }

  detectedCountLabel.textContent = `(Found ${validTokensFound} codes)`;

  // 3. Generate Status
  let presentCount = 0;
  let absentCount = 0;
  const results = [];

  // Build verification panel
  verificationPanel.innerHTML = "";

  masterLines.forEach((id) => {
    const last4 = id.length >= 4 ? id.slice(-4) : id;
    const isPresent = presentSet.has(last4);

    results.push(isPresent ? "Present" : "Absent");
    if (isPresent) presentCount++;
    else absentCount++;

    const line = document.createElement("div");
    line.className = "verify-line";
    line.innerHTML = `<span class="v-id">${id}</span><span class="v-arrow">&#8594;</span><span class="v-code">${isPresent ? last4 : "NA"}</span><span class="v-badge ${isPresent ? "present" : "absent"}">${isPresent ? "Present" : "Absent"}</span>`;
    verificationPanel.appendChild(line);
  });

  // 4. Output
  resultOutput.value = results.join("\n");
  updateCounts(presentCount, absentCount);
}

function copyToClipboard() {
  const text = resultOutput.value;
  if (!text) return;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              Copied!
          `;
      copyBtn.classList.add("bg-slate-800");

      setTimeout(() => {
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove("bg-slate-800");
      }, 2000);
    })
    .catch(() => {
      // Fallback for environments where clipboard API is unavailable
      resultOutput.select();
      document.execCommand("copy");
    });
}
