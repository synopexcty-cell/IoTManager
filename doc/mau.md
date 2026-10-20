<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lịch OT tháng 10/2026</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 16px;
      font-family: "Times New Roman", serif;
      color: #000;
    }

    .table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      table-layout: fixed;
      min-width: 1900px;
      width: max-content;
      font-size: 14px;
    }

    th,
    td {
      border: 1px solid #111;
      height: 42px;
      padding: 4px;
      text-align: center;
      vertical-align: middle;
    }

    thead th {
      font-weight: bold;
      background: #fff;
    }

    .title-cell {
      min-width: 400px;
      text-align: left;
      padding-left: 10px;
    }

    .no-col {
      width: 65px;
    }

    .team-col {
      width: 75px;
    }

    .shift-col {
      width: 90px;
    }

    .name-col {
      width: 175px;
      text-align: left;
    }

    .day-col {
      width: 47px;
    }

    .total-col {
      width: 70px;
      font-weight: bold;
      background: #fff1a6;
    }

    .saturday {
      background: #ffc000;
    }

    .sunday,
    .orange-day {
      background: #ed7d31;
    }

    .staff-no {
      position: relative;
    }

    .staff-no::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      border-top: 7px solid #4caf50;
      border-right: 7px solid transparent;
    }

    .leave {
      background: #000;
      color: #fff;
      font-weight: bold;
    }

    tfoot td {
      font-weight: bold;
    }

    .note {
      margin-top: 8px;
      width: 330px;
      min-height: 85px;
      padding: 8px 10px;
      border: 1px solid red;
      background: #dceaf7;
    }

    .note-title {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 4px;
    }

    .note .p {
      color: red;
      font-weight: bold;
    }
  </style>
</head>

<body>
  <div class="table-wrap">
    <table id="otTable"></table>
  </div>

  <div class="note">
    <div class="note-title">Note</div>
    <div><span class="p">P</span> --&gt; Nghỉ phép</div>
    <div><span class="p">/</span> --&gt; Nghỉ</div>
  </div>

  <script>
    // Có thể đổi tháng và năm tại đây
    const month = 10;
    const year = 2026;

    const staff = [
      {
        no: 1,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Bá Sơn",
        ot: { 1: 1.5, 3: 5.5, 6: 1.5, 7: 1.5, 8: 1.5, 9: 2.5, 10: 11, 11: 11, 13: 2.5, 14: 2.5, 17: "P", 20: 2.5, 21: 1.5, 22: 2.5, 24: 11, 25: 11, 27: 2.5, 28: 1.5, 29: 2.5, 31: 5.5 }
      },
      {
        no: 2,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Thị Thanh Thúy",
        ot: { 3: 3, 10: 8.5, 17: 9.5, 24: 8.5 }
      },
      {
        no: 3,
        team: "IOT",
        shift: "Hành Chính",
        name: "Phùng Văn Duy",
        ot: { 1: 2.5, 2: 1.5, 3: 5.5, 6: 2.5, 7: 2.5, 8: 2.5, 9: 1.5, 10: 8.5, 13: 2.5, 14: 2.5, 15: 2.5, 16: 1.5, 17: 9.5, 20: 2.5, 21: 2.5, 22: 2.5, 27: 2.5, 28: 2.5, 29: 2.5, 30: 1.5, 31: 3 }
      },
      {
        no: 4,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Văn Trường",
        ot: { 1: 1.5, 2: 1.5, 3: 3, 4: 11, 6: 1.5, 8: 1.5, 11: 11, 12: 1.5, 13: 1.5, 15: 1.5, 16: 1.5, 18: 11, 19: 1.5, 20: 1.5, 22: 1.5, 24: 11, 25: 11, 27: 1.5, 29: 1.5, 31: "P" }
      },
      {
        no: 5,
        team: "IOT",
        shift: "Hành Chính",
        name: "Lâm Quốc Cẩm",
        ot: { 1: 2.5, 2: 2.5, 3: 5.5, 4: 11, 5: 2.5, 7: 2.5, 9: 2.5, 16: 2.5, 21: 2.5, 23: 2.5, 26: 2.5, 28: 2.5, 30: 2.5 }
      },
      {
        no: 6,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Ngọc Quang",
        ot: { 2: 2, 3: 2, 6: 2, 7: 2, 9: 2, 11: 11, 13: 2, 16: 2, 18: 8.5, 20: 2, 21: 2, 23: 2, 24: 11, 27: 2, 28: 2, 30: 2 }
      },
      {
        no: 7,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Trường Sơn",
        ot: { 3: 5.5, 31: 5.5 }
      },
      {
        no: 9,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Phan Quân",
        ot: { 17: 9.5, 20: 1.5, 21: 1.5, 22: 1.5, 24: 8.5, 27: 1.5, 29: 2.5, 31: 3 }
      },
      {
        no: 10,
        team: "IOT",
        shift: "Hành Chính",
        name: "Nguyễn Huy Lâm",
        ot: { 12: 1.5, 13: 1.5, 14: 1.5, 15: 1.5, 16: 1.5, 18: 11, 19: 1.5, 20: 1.5, 21: 1.5, 22: 1.5, 23: 1.5, 24: 11, 25: 11, 26: 1.5, 27: 1.5, 28: 1.5, 29: 1.5, 30: 1.5, 31: 5.5 }
      }
    ];

    const table = document.getElementById("otTable");
    const daysInMonth = new Date(year, month, 0).getDate();

    // Các ngày Chủ Nhật hoặc ngày muốn tô màu cam
    const orangeDays = new Set([10, 11, 18, 24, 25]);

    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    function dayClass(day) {
      const weekday = new Date(year, month - 1, day).getDay();

      if (weekday === 0 || orangeDays.has(day)) return "sunday";
      if (weekday === 6) return "saturday";
      return "";
    }

    function displayValue(value) {
      return value === undefined || value === null ? "" : value;
    }

    function employeeTotal(person) {
      return Object.values(person.ot).reduce((sum, value) => {
        return typeof value === "number" ? sum + value : sum;
      }, 0);
    }

    // Tiêu đề và ngày trong tháng
    const headerRow1 = document.createElement("tr");
    headerRow1.innerHTML =
      `<th class="title-cell" colspan="4">Lịch OT — Tháng ${month}/${year}</th>`;

    for (let day = 1; day <= daysInMonth; day++) {
      headerRow1.innerHTML += `
        <th class="day-col ${dayClass(day)}">${day}</th>
      `;
    }

    headerRow1.innerHTML += `<th class="total-col">Tổng</th>`;
    table.appendChild(headerRow1);

    // Tên cột và thứ trong tuần
    const headerRow2 = document.createElement("tr");
    headerRow2.innerHTML = `
      <th class="no-col">No</th>
      <th class="team-col">Team</th>
      <th class="shift-col">Ca</th>
      <th class="name-col">Họ và Tên<br>Full Name</th>
    `;

    for (let day = 1; day <= daysInMonth; day++) {
      const weekday = weekdays[new Date(year, month - 1, day).getDay()];
      headerRow2.innerHTML += `
        <th class="day-col ${dayClass(day)}">${weekday}</th>
      `;
    }

    headerRow2.innerHTML += `<th class="total-col">Giờ OT</th>`;
    table.appendChild(headerRow2);

    // Dữ liệu nhân viên
    staff.forEach((person, index) => {
      const row = document.createElement("tr");

      let cells = `<td class="staff-no">${person.no}</td>`;

      // Gộp ô Team và Ca cho toàn bộ danh sách nhân viên
      if (index === 0) {
        cells += `<td rowspan="${staff.length}">${person.team}</td>`;
        cells += `<td rowspan="${staff.length}">${person.shift}</td>`;
      }

      cells += `<td class="name-col">${person.name}</td>`;

      for (let day = 1; day <= daysInMonth; day++) {
        const value = person.ot[day];
        const isLeave = value === "P" || value === "/";

        cells += `
          <td class="day-col ${dayClass(day)} ${isLeave ? "leave" : ""}">
            ${displayValue(value)}
          </td>
        `;
      }

      cells += `<td class="total-col">${employeeTotal(person).toFixed(1)}</td>`;
      row.innerHTML = cells;
      table.appendChild(row);
    });

    // Dòng tổng: đếm số nhân viên có dữ liệu OT mỗi ngày
    const totalRow = document.createElement("tr");
    let totalCells = `<td colspan="4">Total member OT</td>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const count = staff.filter(person => {
        return typeof person.ot[day] === "number";
      }).length;

      totalCells += `
        <td class="day-col ${dayClass(day)}">${count || ""}</td>
      `;
    }

    const totalAssignments = staff.reduce((sum, person) => {
      return sum + Object.values(person.ot).filter(value => typeof value === "number").length;
    }, 0);

    totalCells += `<td class="total-col">${totalAssignments}</td>`;
    totalRow.innerHTML = totalCells;
    table.appendChild(totalRow);
  </script>
</body>
</html>