const PASSWORD = "hankook2580"; 
// 원하는 비밀번호로 바꾸세요. 예: const PASSWORD = "hankook2026";

const SHEET_ID = "14mOvdmVfVP5ck9L2hKQQppgbFjjYAa3DCfoG2sehQh0";

const sheetUrls = {
  "1. 주요트래픽추이": `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
  "2. 플랫폼과제 진행 상황": `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1489781128`,
  "3. 뉴스룸전략진행상황": `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=216245555`,
  "4. 기타 진행상황": `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1245395043`
};

const dashboardConfig = [
  {
    title: "1. 주요트래픽추이",
    items: [
      { title: "1. 닷컴 프래픽 추이", type: "table" },
      { title: "2. 유입경로별 방문자수 추이", type: "stackedBar" },
      { title: "3. 외부 포털 트래픽 추이", type: "line" }
    ]
  },
  {
    title: "2. 플랫폼과제 진행 상황",
    items: [
      { title: "1. 플랫폼 부문 과제 수행 점검", type: "table" }
    ]
  },
  {
    title: "3. 뉴스룸전략진행상황",
    items: [
      { title: "1. 현황", type: "table" },
      { title: "2. 대응전략", type: "table" },
      { title: "3. 남은 과제", type: "table" }
    ]
  },
  {
    title: "4. 기타 진행상황",
    items: [
      { title: "1. 협의사항", type: "table" }
    ]
  }
];

function checkPassword() {
  const input = document.getElementById("passwordInput").value;

  if (input === PASSWORD) {
    localStorage.setItem("trafficDashboardLogin", "yes");
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    renderDashboard();
  } else {
    document.getElementById("loginMessage").innerText = "비밀번호가 틀렸습니다.";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("trafficDashboardLogin") === "yes") {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    renderDashboard();
  }
});

async function loadSheet(url) {
  const response = await fetch(url + "&cacheBust=" + Date.now());
  const text = await response.text();

  return Papa.parse(text, {
    skipEmptyLines: false
  }).data;
}

function extractTableByTitle(rows, subTitle) {
  const startIndex = rows.findIndex(row =>
    row.some(cell => String(cell).trim() === subTitle)
  );

  if (startIndex === -1) return rows.filter(row => row.some(cell => String(cell).trim() !== ""));

  const tableRows = [];

  for (let i = startIndex + 1; i < rows.length; i++) {
    const row = rows[i].map(cell => String(cell).trim());
    const isEmpty = row.every(cell => cell === "");

    const isNextSubTitle = dashboardConfig.some(section =>
      section.items.some(item => item.title === row[0])
    );

    if (isEmpty && tableRows.length > 0) break;
    if (isNextSubTitle && tableRows.length > 0) break;

    if (!isEmpty) tableRows.push(row);
  }

  return tableRows;
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    return "<p>해당 표 데이터를 찾지 못했습니다.</p>";
  }

  const headers = rows[0];
  const body = rows.slice(1);

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${body.map(row => `
            <tr>
              ${headers.map((_, i) => `<td>${escapeHtml(row[i] || "")}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderChart(canvasId, rows, type) {
  if (!rows || rows.length < 2) return;

  const headers = rows[0];
  const body = rows.slice(1);

  const labels = body.map(row => row[0]);

  const datasets = headers.slice(1).map((header, index) => ({
    label: header,
    data: body.map(row => toNumber(row[index + 1]))
  }));

  const options = {
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: { position: "bottom" },
      tooltip: { enabled: true }
    },
    scales: {}
  };

  let chartType = "line";

  if (type === "stackedBar") {
    chartType = "bar";
    options.scales = {
      x: { stacked: true },
      y: { stacked: true }
    };
  }

  new Chart(document.getElementById(canvasId), {
    type: chartType,
    data: { labels, datasets },
    options
  });
}

async function renderDashboard() {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  for (let sectionIndex = 0; sectionIndex < dashboardConfig.length; sectionIndex++) {
    const section = dashboardConfig[sectionIndex];
    const rows = await loadSheet(sheetUrls[section.title]);

    const sectionEl = document.createElement("section");
    sectionEl.className = "section";

    sectionEl.innerHTML = `
      <div class="section-title">${section.title}</div>
      <div class="content"></div>
    `;

    const sectionTitle = sectionEl.querySelector(".section-title");
    const sectionContent = sectionEl.querySelector(".content");

    sectionTitle.addEventListener("click", () => {
      sectionContent.classList.toggle("open");
    });

    section.items.forEach((item, itemIndex) => {
      const tableRows = extractTableByTitle(rows, item.title);
      const canvasId = `chart-${sectionIndex}-${itemIndex}`;

      const subsectionEl = document.createElement("div");
      subsectionEl.className = "subsection";

      subsectionEl.innerHTML = `
        <div class="subsection-title">${item.title}</div>
        <div class="content">
          ${renderTable(tableRows)}
          ${item.type !== "table" ? `<canvas id="${canvasId}"></canvas>` : ""}
        </div>
      `;

      const subTitle = subsectionEl.querySelector(".subsection-title");
      const subContent = subsectionEl.querySelector(".content");

      subTitle.addEventListener("click", () => {
        subContent.classList.toggle("open");
      });

      sectionContent.appendChild(subsectionEl);

      if (item.type !== "table") {
        setTimeout(() => renderChart(canvasId, tableRows, item.type), 100);
      }
    });

    dashboard.appendChild(sectionEl);
  }
}

function toNumber(value) {
  if (!value) return 0;
  return Number(String(value).replace(/,/g, "").replace(/%/g, "")) || 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}