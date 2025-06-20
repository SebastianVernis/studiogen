module.exports = {
  apps: [{
    name: "studiogen",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "production",
      PORT: 9002,
      HOST: "0.0.0.0"
    }
  }]
};
