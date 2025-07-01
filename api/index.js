window.onload = function () {
  // Begin Swagger UI call
  const ui = SwaggerUIBundle({
    url: "./bulk-logistics-api.yaml", // Path to the OpenAPI YAML file
    dom_id: "#swagger-ui",
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
  });

  window.ui = ui;
};
