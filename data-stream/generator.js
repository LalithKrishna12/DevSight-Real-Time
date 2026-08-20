console.log("Generator started");

const services = ["Auth", "Payment", "Order", "Inventory"];
const levels = ["INFO", "WARN", "ERROR"];

setInterval(() => {
  const event = {
    timestamp: new Date().toISOString(),
    service: services[Math.floor(Math.random() * services.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    cpuUsage: Math.floor(Math.random() * 100),
    memoryUsage: Math.floor(Math.random() * 100),
    responseTime: Math.floor(Math.random() * 1000),
    message: "Generated event"
  };

  console.log(event);
}, 2000);