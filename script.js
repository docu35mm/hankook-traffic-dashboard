const APP_PASSWORD = "hankook2026";

const SHEET_ID = "14mOvdmVfVP5ck9L2hKQQppgbFjjYAa3DCfoG2sehQh0";

const sheets = {
  overview: { title: "1. 개요", gid: "737075050", type: "table" },
  dotcomTraffic: { title: "2_1. 닷컴 트래픽 추이", gid: "0", type: "table" },
  inflowTraffic: { title: "2_2. 닷컴 유입경로별 방문자수 추이", gid: "354858249", type: "stackedBarWithTable" },
  portalTraffic: { title: "2_3. 외부 포털 트래픽 추이", gid: "2120757618", type: "lineWithTable" },
  platformTask: { title: "3. 플랫폼 부문 과제 수행 점검", gid: "1489781128", type: "table" },
  newsroomStatus: { title: "4_1. 뉴스룸국 현황", gid: "216245555", type: "table" },
  newsroomStrategy: { title: "4_2. 뉴스룸국 대응 전략", gid: "630719473", type: "table" },
  newsroomTasks: { title: "4_3. 뉴스룸국 남은 과제", gid: "1031404324", type: "table" },
  etc: { title: "5. 기타 협의 사항", gid: "1245395043", type: "table" }
};

const dashboardConfig = [
  { title: "1. 개요", directSheet: sheets.overview },
  {
    title: "2. 주요 트래픽 추이",
    children: [
      sheets.dotcomTraffic,
      sheets.inflowTraffic,
      sheets.portalTraffic
    ]
  },
  { title: "3. 플랫폼 부문 과제 수행 점검", directSheet: sheets.platformTask },
  {
    title: "4. 뉴스룸국 전략 진행 상황",
    children: [
      sheets.newsroomStatus,
      sheets.newsroomStrategy,
      sheets.newsroomTasks
    ]
  },
  { title: "5. 기타 협의 사항", directSheet: sheets.etc }
];

const loadedSheets = {};
const chartInstances = {};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginButton").addEventListener("click", checkPassword);

  document.getElementById("passwordInput").addEventListener("keydown", e => {
    if (e.key === "Enter") checkPassword();
  });

  document.getElementById("openAllButton").addEventListener("click", openAll);
  document.getElementById("closeAllButton").addEventListener("click", closeAll);
});

function checkPassword() {
  const input = document.getElementById("passwordInput").value.trim();

  if (input === APP_PASSWORD) {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appScreen").style.display = "block";
    renderDashboard();
  } else {
    document.getElementById("loginMessage").innerText = "비밀번호가 틀렸습니다.";
  }
}

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

async function fetchSheetRows(gid) {
  const response = await fetch(`${csvUrl(gid)}&cacheBust=${Date.now()}`);
  const text = await response.text();

  const parsed = Papa.parse(text, {
    skipEmptyLines: false
  });

  return parsed.data
    .map(row => row.map(cell => String(cell ?? "").trim()))
    .filter(row => row.some(cell => cell !== ""));
}

function renderDashboard() {
  const dashboard = document.getElementById("dashboard");
  dashboard.innerHTML = "";

  dashboardConfig.forEach((section, sectionIndex) => {
    const accordion = document.createElement("article");
    accordion.className = "accordion";

    accordion.innerHTML = `
      <button class="accordionHeader">
        <span>${section.title}</span>
        <span class="plus">+</span>
      </button>
      <div class="accordionBody"></div>
    `;

    const header = accordion.querySelector(".accordionHeader");
    const body = accordion.querySelector(".accordionBody");

    header.addEventListener("click", async () => {
      accordion.classList.toggle("open");

      if (section.directSheet && !loadedSheets[section.directSheet.title]) {
        loadedSheets[section.directSheet.title] = true;
        await loadSheet(body, section.directSheet, `section-${sectionIndex}`);
      }
    });

    dashboard.appendChild(accordion);

    if (section.directSheet) {
      body.innerHTML = `<p class="status">제목을 누르면 데이터를 불러옵니다.</p>`;
    }

    if (section.children) {
      section.children.forEach((sheet, childIndex) => {
        renderSubAccordion(body, sheet, `section-${sectionIndex}-${childIndex}`);
      });
    }
  });
}

function renderSubAccordion(container, sheet, id) {
  const sub = document.createElement("div");
  sub.className = "subAccordion";

  sub.innerHTML = `
    <button class="subAccordionHeader">
      <span>${sheet.title}</span>
      <span class="plus">+</span>
    </button>
    <div class="subAccordionBody">
      <p class="status">소제목을 누르면 데이터를 불러옵니다.</p>
    </div>
  `;

  const header = sub.querySelector(".subAccordionHeader");
  const body = sub.querySelector(".subAccordionBody");

  header.addEventListener("click", async () => {
    sub.classList.toggle("open");

    if (!loadedSheets[sheet.title]) {
      loadedSheets[sheet.title] = true;
      await loadSheet(body, sheet, id);
    }
  });

  container.appendChild(sub);
}

async function loadSheet(container, sheet, id) {
  container.innerHTML = `<p class="status">데이터를 불러오는 중입니다.</p>`;

  try {
    const rows = await fetchSheetRows(sheet.gid);

    if (sheet.type === "table") {
      container.innerHTML = renderTable(rows);
      return;
    }

    const canvasId = `chart-${id}`;

    container.innerHTML = `
      <div class="chartTableGrid">
        <div>
          <h3>${sheet.title}</h3>
          ${renderTable(rows)}
        </div>
        <div>
          <h3>${sheet.title.replace(/^2_2\.|^2_3\./, "").trim()}</h3>
          <div class="chartBox">
            <canvas id="${canvasId}"></canvas>
          </div>
        </div>
      </div>
    `;

    if (sheet.type === "stackedBarWithTable") {
      renderStackedBar(canvasId, rows);
    }

    if (sheet.type === "lineWithTable") {
      renderLineChart(canvasId, rows);
    }
  } catch (error) {
    container.innerHTML = `<p class="error">데이터를 불러오지 못했습니다.</p>`;
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
            ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${body.map(row => `
            <tr>
              ${headers.map((_, i) => `<td>${formatCell(row[i] || "")}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStackedBar(canvasId, rows) {
  const headers = rows[0];
  const body = rows.slice(1);

  const labels = body.map(row => row[0]);

  const datasets = headers.slice(1).map((header, index) => ({
    label: header,
    data: body.map(row => toNumber(row[index + 1]))
  }));

  createChart(canvasId, {
    type: "bar",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: { position: "right" },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatNumber(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            callback: value => formatNumber(value)
          }
        },
        y: {
          stacked: true
        }
      }
    }
  });
}

function renderLineChart(canvasId, rows) {
  const headers = rows[0];
  const body = rows.slice(1);

  const labels = body.map(row => row[0]);

  const datasets = headers.slice(1).map((header, index) => ({
    label: header,
    data: body.map(row => toNumber(row[index + 1])),
    tension: 0.25,
    pointRadius: 3,
    pointHoverRadius: 6
  }));

  createChart(canvasId, {
    type: "line",
    data: { labels, datasets },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        intersect: false
      },
      plugins: {
        legend: { position: "right" },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatNumber(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: value => formatNumber(value)
          }
        },
        y: {}
      }
    }
  });
}

function createChart(canvasId, config) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  chartInstances[canvasId] = new Chart(
    document.getElementById(canvasId),
    config
  );
}

function toNumber(value) {
  if (!value || value === "-") return 0;

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

function formatNumber(value) {
  return Number(value).toLocaleString("ko-KR");
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
  document.querySelectorAll(".accordion").forEach(el => el.classList.add("open"));
  document.querySelectorAll(".subAccordion").forEach(el => el.classList.add("open"));

  const buttons = document.querySelectorAll(".subAccordionHeader");

  for (const button of buttons) {
    const title = button.querySelector("span").innerText;
    const sheet = Object.values(sheets).find(s => s.title === title);
    const body = button.closest(".subAccordion").querySelector(".subAccordionBody");

    if (sheet && !loadedSheets[sheet.title]) {
      loadedSheets[sheet.title] = true;
      await loadSheet(body, sheet, sheet.title);
    }
  }
}

function closeAll() {
  document.querySelectorAll(".accordion, .subAccordion").forEach(el => {
    el.classList.remove("open");
  });
}