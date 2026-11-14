# Unported KubeJS content

These scripts and data files were written for KubeJS 6 on Minecraft 1.20.1. KubeJS does not load
anything from this folder, so the 1.21.1 NeoForge pack boots without them.

Each slice of the port (epic #5) moves the files it ports back to `kubejs/startup_scripts`,
`kubejs/server_scripts`, `kubejs/client_scripts` or `kubejs/data`. The folder is not exported
into the CurseForge pack.

The data files (`kubejs/_unported/data`) are all ported or deleted (Slice 14, #19). The `tools/port/port_*_data.py`
scripts read them from this folder; to run one again, restore the folder from the commit before
"Remove the ported data sources" first (`git checkout <commit>~1 -- kubejs/_unported/data`).
