window.EXPERIENCE_CODE = {
  "rootLabel": "Hugo Inc PDF Customisation",
  "defaultKey": "project-json",
  "files": {
    "gitignore": {
      "label": ".gitignore",
      "section": "Workspace Root",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/.gitignore",
      "language": "txt",
      "code": "# IDEs and editors\n.idea\n*.iml\n*.iws\n.project\n.classpath\n*.launch\n.settings\n*.sublime-workspace\n.vscode\n\n# Dependency directories\nnode_modules\n\n# TypeScript cache\n*.tsbuildinfo\n\n# Logs\nlogs\n*.log\nnpm-debug.log*\n\n# Packaged SuiteCloud projects\nbuild\n\n# misc\n.sass-cache\n\n# Optional npm cache directory\n.npm\n\n# System Files\n.DS_Store\nThumbs.db\n\n# Output of 'npm pack'\n*.tgz\n\n# Project config\nproject.json\n"
    },
    "project-json": {
      "label": "project.json",
      "section": "Workspace Root",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/project.json",
      "language": "json",
      "code": "{\n\t\"defaultAuthId\": \"Krayden\"\n}"
    },
    "readme-md": {
      "label": "README.md",
      "section": "Workspace Root",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/README.md",
      "language": "md",
      "code": "# Introduction \r\nTODO: Give a short introduction of your project. Let this section explain the objectives or the motivation behind this project. \r\n\r\n# Getting Started\r\nTODO: Guide users through getting your code up and running on their own system. In this section you can talk about:\r\n1.\tInstallation process\r\n2.\tSoftware dependencies\r\n3.\tLatest releases\r\n4.\tAPI references\r\n\r\n# Build and Test\r\nTODO: Describe and show how to build your code and run the tests. \r\n\r\n# Contribute\r\nTODO: Explain how other users and developers can contribute to make your code better. \r\n\r\nIf you want to learn more about creating good readme files then refer the following [guidelines](https://docs.microsoft.com/en-us/azure/devops/repos/git/create-a-readme?view=azure-devops). You can also seek inspiration from the below readme files:\r\n- [ASP.NET Core](https://github.com/aspnet/Home)\r\n- [Visual Studio Code](https://github.com/Microsoft/vscode)\r\n- [Chakra Core](https://github.com/Microsoft/ChakraCore)"
    },
    "src-deploy-xml": {
      "label": "deploy.xml",
      "section": "src",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/deploy.xml",
      "language": "xml",
      "code": "<deploy>\n    <configuration>\n        <path>~/AccountConfiguration/*</path>\n    </configuration>\n    <files>\n        <path>~/FileCabinet/*</path>\n    </files>\n    <objects>\n        <path>~/Objects/*</path>\n    </objects>\n    <translationimports>\n        <path>~/Translations/*</path>\n    </translationimports>\n</deploy>\n"
    },
    "src-filecabinet-advanced-pdf-layout-09-03-2026-invoice-xml": {
      "label": "invoice.xml",
      "section": "Advanced PDF Layout",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/FileCabinet/Advanced PDF Layout/09-03-2026/invoice.xml",
      "language": "xml",
      "code": ""
    },
    "src-filecabinet-advanced-pdf-layout-09-03-2026-invoicebackup-xml": {
      "label": "invoiceBackup.xml",
      "section": "Advanced PDF Layout",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/FileCabinet/Advanced PDF Layout/09-03-2026/invoiceBackup.xml",
      "language": "xml",
      "code": ""
    },
    "src-manifest-xml": {
      "label": "manifest.xml",
      "section": "src",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/src/manifest.xml",
      "language": "xml",
      "code": "<manifest projecttype=\"ACCOUNTCUSTOMIZATION\">\n  <projectname>Krayden</projectname>\n  <frameworkversion>1.0</frameworkversion>\n</manifest>"
    },
    "suitecloud-config-js": {
      "label": "suitecloud.config.js",
      "section": "Workspace Root",
      "project": "Hugo Inc",
      "path": "Projects-Crowe Howarth/Internship Capstone-II/Billbale Projects/Hugo Inc/Enhancement-111161(PDF Customisation)/New/suitecloud.config.js",
      "language": "js",
      "code": "module.exports = {\n\tdefaultProjectFolder: \"src\",\n\tcommands: {}\n};\n"
    }
  },
  "tree": [
    {
      "label": "src",
      "type": "folder",
      "expanded": true,
      "children": [
        {
          "label": "FileCabinet",
          "type": "folder",
          "expanded": true,
          "children": [
            {
              "label": "Advanced PDF Layout",
              "type": "folder",
              "expanded": false,
              "children": [
                {
                  "label": "09-03-2026",
                  "type": "folder",
                  "expanded": false,
                  "children": [
                    {
                      "label": "invoice.xml",
                      "type": "file",
                      "key": "src-filecabinet-advanced-pdf-layout-09-03-2026-invoice-xml"
                    },
                    {
                      "label": "invoiceBackup.xml",
                      "type": "file",
                      "key": "src-filecabinet-advanced-pdf-layout-09-03-2026-invoicebackup-xml"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "label": "deploy.xml",
          "type": "file",
          "key": "src-deploy-xml"
        },
        {
          "label": "manifest.xml",
          "type": "file",
          "key": "src-manifest-xml"
        }
      ]
    },
    {
      "label": ".gitignore",
      "type": "file",
      "key": "gitignore"
    },
    {
      "label": "project.json",
      "type": "file",
      "key": "project-json"
    },
    {
      "label": "README.md",
      "type": "file",
      "key": "readme-md"
    },
    {
      "label": "suitecloud.config.js",
      "type": "file",
      "key": "suitecloud-config-js"
    }
  ]
};
