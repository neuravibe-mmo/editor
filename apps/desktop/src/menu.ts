/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { app, BrowserWindow, dialog, Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";

import { CLI_LINK_PATH, installCli } from "./cli-install";

async function installCliFromMenu() {
  const result = await installCli();
  if (result.status === "cancelled") return;
  if (result.status === "installed") {
    await dialog.showMessageBox({
      type: "info",
      message: "The dapi command line tool was installed.",
      detail: `Linked at ${CLI_LINK_PATH}. Run "dapi --help" in a terminal to get started.`,
    });
  } else {
    await dialog.showMessageBox({
      type: "error",
      message: "Could not install the dapi command line tool.",
      detail: result.error,
    });
  }
}

function dispatchToFocusedWindow(event: string) {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    focused.webContents
      .executeJavaScript(`window.dispatchEvent(new CustomEvent(${JSON.stringify(event)}))`)
      .catch(() => {});
  }
}

export function setupAppMenu() {
  if (process.platform !== "darwin") return;

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Preferences…",
          accelerator: "CmdOrCtrl+,",
          click: () => dispatchToFocusedWindow("vixa:open-account"),
        },
        { type: "separator" },
        {
          label: "Install dapi Command Line Tool…",
          enabled: app.isPackaged,
          click: installCliFromMenu,
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "Go to Dashboard",
          accelerator: "Shift+CmdOrCtrl+D",
          click: () => dispatchToFocusedWindow("vixa:go-dashboard"),
        },
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => dispatchToFocusedWindow("vixa:new-project"),
        },
        { type: "separator" },
        {
          label: "Import…",
          accelerator: "CmdOrCtrl+I",
          click: () => dispatchToFocusedWindow("vixa:import"),
        },
        {
          label: "Export",
          accelerator: "CmdOrCtrl+E",
          click: () => dispatchToFocusedWindow("vixa:export"),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+Plus",
          click: () => dispatchToFocusedWindow("vixa:zoom-in"),
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => dispatchToFocusedWindow("vixa:zoom-out"),
        },
        {
          label: "Actual Size",
          accelerator: "CmdOrCtrl+0",
          click: () => dispatchToFocusedWindow("vixa:zoom-reset"),
        },
        {
          label: "Zoom to Fit",
          accelerator: "CmdOrCtrl+1",
          click: () => dispatchToFocusedWindow("vixa:zoom-fit"),
        },
        { type: "separator" },
        {
          label: "Toggle Timeline",
          click: () => dispatchToFocusedWindow("vixa:toggle-timeline"),
        },
        {
          label: "Toggle UI",
          click: () => dispatchToFocusedWindow("vixa:toggle-ui"),
        },
        { type: "separator" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Tool",
      submenu: [
        {
          label: "Generate with AI…",
          click: () => dispatchToFocusedWindow("vixa:tool-ai"),
        },
        { type: "separator" },
        {
          label: "Scene",
          accelerator: "F",
          click: () => dispatchToFocusedWindow("vixa:tool-scene"),
        },
        {
          label: "Text",
          accelerator: "T",
          click: () => dispatchToFocusedWindow("vixa:tool-text"),
        },
        {
          label: "Rectangle",
          accelerator: "R",
          click: () => dispatchToFocusedWindow("vixa:tool-rect"),
        },
      ],
    },
    {
      label: "Account",
      submenu: [
        {
          label: "Account Settings…",
          accelerator: "CmdOrCtrl+,",
          click: () => dispatchToFocusedWindow("vixa:open-account"),
        },
        { type: "separator" },
        {
          label: "Go to Dashboard",
          accelerator: "Shift+CmdOrCtrl+D",
          click: () => dispatchToFocusedWindow("vixa:go-dashboard"),
        },
      ],
    },
    { role: "windowMenu" },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
