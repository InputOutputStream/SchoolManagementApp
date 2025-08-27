document.getElementById("marksForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("studentName").value;
    const subject = document.getElementById("subject").value;
    const marks = document.getElementById("marks").value;

    const response = await fetch("http://localhost:5000/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_name: name, subject: subject, marks: marks })
    });

    const data = await response.json();
    document.getElementById("result").innerHTML = `<div class="alert alert-success">${data.message}</div>`;
});


 // Attendance Chart
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    const attendanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        datasets: [{
          label: 'Attendance',
          data: [300, 350, 400, 380, 370, 370.5],
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 550 }
        }
      }
    });

    // Calendar
    const calendar = document.getElementById('calendar');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dates = Array.from({length: 30}, (_, i) => i + 1);
    calendar.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;">
        ${days.map(day => `<div style="text-align: center;">${day}</div>`).join('')}
        ${dates.map(date => `<div style="text-align: center; padding: 5px; background: ${[19, 25, 30].includes(date) ? '#3b82f6' : '#2d3748'}; border-radius: 50%;">${date}</div>`).join('')}
      </div>
    `;