const APP_PASSWORD = "hankook2026";
// 원하는 비밀번호로 바꾸세요.

const SHEET_ID = "14mOvdmVfVP5ck9L2hKQQppgbFjjYAa3DCfoG2sehQh0";

const sheets = {
  overview: {
    title: "1. 개요",
    gid: "737075050",
    type: "table"
  },
  dotcomTraffic: {
    title: "2_1. 닷컴 트래픽 추이",
    gid: "0",
    type: "table"
  },
  inflowTraffic: {
    title: "2_2. 닷컴 유입경로별 방문자수 추이",
    gid: "354858249",
    type: "stackedBar"
  },
  portalTraffic: {
    title: "2_3. 외부 포털 트래픽 추이",
    gid: "2120757618",
    type: "line"
  },
  platformTask: {
    title: "3. 플랫폼 부문 과제 수행 점검",
    gid: "1489781128",
    type: "table"
  },
  newsroomStatus: {
    title: "4_1. 뉴스룸국 현황",
    gid: "216245555",
    type: "table"
  },
  newsroomStrategy: {
    title: "4_2. 뉴스룸국 대응 전략",
    gid: "630719473",
    type: "table"
  },
  newsroomTasks: {
    title: "4_3. 뉴스룸국 남은 과제",
    gid: "1031404324",
    type: "table"
  },
  etc: {
    title: "5. 기타 협의 사항",
    gid: "1245395043",
    type: "table"
  }
};

const dashboardConfig = [
  {
    title: "1. 개요",
    directSheet: sheets.overview
  },
  {
    title: "2. 주요 트래픽 추이",
    children: [
      sheets.dotcomTraffic,
      sheets.inflowTraffic,
      sheets.portalTraffic
    ]
  },
  {
    title: "3. 플랫폼 부문 과제 수행 점검",
    directSheet: sheets.platformTask
  },
  {
    title: "4. 뉴스룸국 전략 진행 상황",
    children: [
      sheets.newsroomStatus,
      sheets.newsroomStrategy,
      sheets.newsroomTasks
    ]
  },
  {
    title: "5. 기타 협의 사항",
    directSheet: sheets.etc
  }
];

const loadedSheets = {};
const chartInstances = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginButton").addEventListener("click", checkPassword);

  document.getElementById("passwordInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      checkPassword();
    }
  });

  document.getElementById("openAllButton").addEventListener("click", openAll);
  document.getElementById("closeAllButton").addEventListener("click", closeAll);
});

function checkPassword() {
  const input = document.getElementById("passwordInput").value.trim();

  if (input === APP_PASSWORD) {
    showApp();
  } else {
    document.getElementById("loginMessage").innerText = "비밀번호가 틀렸습니다.";
  }
}

function showApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appScreen").style.display = "block";
  renderDashboard();
}

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

async function fetchSheetRows(gid) {
  const response = await fetch(`${csvUrl(gid)}&cacheBust=${Date.now()}`);

  if (!response.ok) {
    throw new Error("스프레드시트를 불러오지 못했습니다.");
  }

  const text = await response.text();

  const parsed = Papa.parse(text, {
    skipEmptyLines: false
  });

  return cleanRows(parsed.data);
}

function cleanRows(rows) {
  return rows
    .map(row => row.map(cell => String(cell ?? "").trim()))
    .filter(row => row.some(cell => cell !== ""));
}

function renderDashboard() {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  dashboardConfig.forEach((section, sectionIndex) => {
    const accordion = document.createElement("article");
    accordion.className = "accordion";

    const header = document.createElement("button");
    header.className = "accordionHeader";
    header.innerHTML = `
      <span>${section.title}</span>
      <span class="plus">+</span>
    `;

    const body = document.createElement("div");
    body.className = "accordionBody";

    header.addEventListener("click", async () => {
      accordion.classList.toggle("open");

      if (section.directSheet && !loadedSheets[section.directSheet.title]) {
        loadedSheets[section.directSheet.title] = true;
        await loadSheetIntoContainer(body, section.directSheet, `section-${sectionIndex}`);
      }
    });

    accordion.appendChild(header);
    accordion.appendChild(body);
    dashboard.appendChild(accordion);

    if (section.children) {
      section.children.forEach((sheet, childIndex) => {
        renderSubAccordion(body, sheet, `section-${sectionIndex}-${childIndex}`);
      });
    }

    if (section.directSheet) {
      body.innerHTML = `<p class="status">제목을 누르면 데이터를 불러옵니다.</p>`;
    }
  });
}

function renderSubAccordion(container, sheet, id) {
  const sub = document.createElement("div");
  sub.className = "subAccordion";

  const header = document.createElement("button");
  header.className = "subAccordionHeader";
  header.innerHTML = `
    <span>${sheet.title}</span>
    <span class="plus">+</span>
  `;

  const body = document.createElement("div");
  body.className = "subAccordionBody";
  body.innerHTML = `<p class="status">소제목을 누르면 데이터를 불러옵니다.</p>`;

  header.addEventListener("click", async () => {
    sub.classList.toggle("open");

    if (!loadedSheets[sheet.title]) {
      loadedSheets[sheet.title] = true;
      await loadSheetIntoContainer(body, sheet, id);
    }
  });

  sub.appendChild(header);
  sub.appendChild(body);
  container.appendChild(sub);
}

async function loadSheetIntoContainer(container, sheet, id) {
  container.innerHTML = `<p class="status">데이터를 불러오는 중입니다.</p>`;

  try {
    const rows = await fetchSheetRows(sheet.gid);

    if (sheet.type === "table") {
      container.innerHTML = renderTable(rows);
      return;
    }

    const canvasId = `chart-${id}`;

    container.innerHTML = `
      ${renderTable(rows)}
      <div class="chartBox">
        <canvas id="${canvasId}"></canvas>
      </div>
    `;

    renderChart(canvasId, rows, sheet.type);
  } catch (error) {
    container.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function renderTable(rows) {
  if (!rows || rows.length === 0) {
    return `<p class="status">표 데이터가 없습니다.</p>`;
  }

  const headers = rows[0];
  const body = rows.slice(1);

  return `
    <div class="tableWrap">
      <table>
        <thead>
          <tr>
            ${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${body.map(row => `
            <tr>
              ${headers.map((_, index) => `
                <td>${formatCell(row[index] || "")}</td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderChart(canvasId, rows, chartType) {
  if (!rows || rows.length < 2) return;

  const headers = rows[0];
  const body = rows.slice(1);

  if (headers.length < 2) return;

  const labels = body.map(row => row[0]);

  const datasets = headers.slice(1).map((header, index) => ({
    label: header,
    data: body.map(row => toNumber(row[index + 1])),
    tension: chartType === "line" ? 0.25 : 0
  }));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        position: "bottom"
      },
      tooltip: {
        enabled: true
      }
    },
    scales: {}
  };

  let type = "line";

  if (chartType === "stackedBar") {
    type = "bar";
    options.scales = {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    };
  }

  if (chartType === "line") {
    type = "line";
    options.scales = {
      y: { beginAtZero: false }
    };
  }

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(document.getElementById(canvasId), {
    type,
    data: {
      labels,
      datasets
    },
    options
  });
}

function toNumber(value) {
  if (value === undefined || value === null) return 0;

  const cleaned = String(value)
    .replaceAll(",", "")
    .replaceAll("%", "")
    .replaceAll("명", "")
    .replaceAll("건", "")
    .replaceAll("회", "")
    .trim();

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function formatCell(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function openAll() {
  document.querySelectorAll(".accordion").forEach(el => {
    el.classList.add("open");
  });

  for (const [sectionIndex, section] of dashboardConfig.entries()) {
    if (section.directSheet && !loadedSheets[section.directSheet.title]) {
      const accordion = document.querySelectorAll(".accordion")[sectionIndex];
      const body = accordion.querySelector(".accordionBody");
      loadedSheets[section.directSheet.title] = true;
      await loadSheetIntoContainer(body, section.directSheet, `section-${sectionIndex}`);
    }
  }

  document.querySelectorAll(".subAccordion").forEach(el => {
    el.classList.add("open");
  });

  const subButtons = document.querySelectorAll(".subAccordionHeader");

  for (const [index, button] of subButtons.entries()) {
    const sub = button.closest(".subAccordion");
    const body = sub.querySelector(".subAccordionBody");

    let count = 0;

    for (const section of dashboardConfig) {
      if (!section.children) continue;

      for (const sheet of section.children) {
        if (count === index && !loadedSheets[sheet.title]) {
          loadedSheets[sheet.title] = true;
          await loadSheetIntoContainer(body, sheet, `open-${index}`);
        }
        count++;
      }
    }
  }
}

function closeAll() {
  document.querySelectorAll(".accordion, .subAccordion").forEach(el => {
    el.classList.remove("open");
  });
}