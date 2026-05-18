const APP_PASSWORD = "hankook2026";

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

const chartInstances = {};

document.addEventListener("DOMContentLoaded", () => {
  const savedLogin = sessionStorage.getItem("hankookTrafficLogin");

  if (savedLogin === "yes") {
    showApp();
  }

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
    sessionStorage.setItem("hankookTrafficLogin", "yes");
    showApp();
  } else {
    document.getElementById("loginMessage").innerText = "비밀번호가 틀렸습니다.";
  }
}

function showApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appScreen").classList.remove("hidden");
  renderDashboard();
}

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

async function fetchSheetRows(gid) {
  const url = `${csvUrl(gid)}&cacheBust=${Date.now()}`;
  const response = await fetch(url);

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

async function renderDashboard() {
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

    header.addEventListener("click", () => {
      accordion.classList.toggle("open");
    });

    accordion.appendChild(header);
    accordion.appendChild(body);
    dashboard.appendChild(accordion);

    if (section.directSheet) {
      renderDirectSheet(body, section.directSheet, `section-${sectionIndex}`);
    }

    if (section.children) {
      section.children.forEach((sheet, childIndex) => {
        renderSubAccordion(body, sheet, `section-${sectionIndex}-${childIndex}`);
      });
    }
  });
}

async function renderDirectSheet(container, sheet, id) {
  const content = document.createElement("div");
  content.className = "sheetContent";
  content.innerHTML = `<p class="status">데이터를 불러오는 중입니다.</p>`;
  container.appendChild(content);

  try {
    const rows = await fetchSheetRows(sheet.gid);
    content.innerHTML = renderTable(rows);

    if (sheet.type !== "table") {
      const canvasId = `chart-${id}`;
      content.insertAdjacentHTML("beforeend", `<canvas id="${canvasId}"></canvas>`);
      renderChart(canvasId, rows, sheet.type);
    }
  } catch (error) {
    content.innerHTML = `<p class="error">${error.message}</p>`;
  }
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
  body.innerHTML = `<p class="status">항목을 누르면 데이터를 불러옵니다.</p>`;

  let loaded = false;

  header.addEventListener("click", async () => {
    sub.classList.toggle("open");

    if (!loaded) {
      loaded = true;
      body.innerHTML = `<p class="status">데이터를 불러오는 중입니다.</p>`;

      try {
        const rows = await fetchSheetRows(sheet.gid);

        if (sheet.type === "table") {
          body.innerHTML = renderTable(rows);
        } else {
          const canvasId = `chart-${id}`;
          body.innerHTML = `
            ${renderTable(rows)}
            <canvas id="${canvasId}"></canvas>
          `;
          renderChart(canvasId, rows, sheet.type);
        }
      } catch (error) {
        body.innerHTML = `<p class="error">${error.message}</p>`;
      }
    }
  });

  sub.appendChild(header);
  sub.appendChild(body);
  container.appendChild(sub);
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

  const datasets = headers.slice(1).map((header, index) => {
    return {
      label: header,
      data: body.map(row => toNumber(row[index + 1])),
      tension: chartType === "line" ? 0.25 : 0
    };
  });

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
      x: {
        stacked: true
      },
      y: {
        stacked: true,
        beginAtZero: true
      }
    };
  }

  if (chartType === "line") {
    type = "line";
    options.scales = {
      y: {
        beginAtZero: false
      }
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

function openAll() {
  document.querySelectorAll(".accordion, .subAccordion").forEach(el => {
    el.classList.add("open");
  });

  document.querySelectorAll(".subAccordionHeader").forEach(button => {
    button.click();
    const parent = button.closest(".subAccordion");
    parent.classList.add("open");
  });
}

function closeAll() {
  document.querySelectorAll(".accordion, .subAccordion").forEach(el => {
    el.classList.remove("open");
  });
}