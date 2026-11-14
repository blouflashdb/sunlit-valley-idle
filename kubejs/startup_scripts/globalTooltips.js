// Ids the item tooltips (server_scripts/tooltips) skip because they are not registered. Server scripts cannot assign
// globals in KubeJS 7, so the list is created here and filled there; the CI test (tooltipsTest.js) reads it.
global.tooltipSkippedIds = [];
