; Inno Setup Script for Gym Management System
; Save this file as: gym-installer.iss

#define MyAppName "X Gym Management System"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Amr Anter"
#define MyAppURL "https://xgym.com"
#define MyAppExeName "run.bat"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\XGym
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=installer-output
OutputBaseFilename=XGym-Setup-{#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\icon.ico
SetupIconFile=icon.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce

[Files]
Source: "package-for-installer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "cmd.exe"; Parameters: "/c ""{app}\run.bat"""; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Stop System"; Filename: "cmd.exe"; Parameters: "/c ""{app}\stop-system.bat"""; WorkingDir: "{app}"
Name: "{group}\Setup Database"; Filename: "cmd.exe"; Parameters: "/c ""{app}\quick-setup-db.bat"""; WorkingDir: "{app}"
Name: "{group}\Post Installation"; Filename: "cmd.exe"; Parameters: "/c ""{app}\post-install.bat"""; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "cmd.exe"; Parameters: "/c ""{app}\run.bat"""; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "notepad.exe"; Parameters: "{app}\README.md"; Description: "View installation instructions"; Flags: postinstall shellexec skipifsilent nowait unchecked
Filename: "cmd.exe"; Parameters: "/c ""{app}\post-install.bat"""; Description: "Run post-installation setup (Install dependencies)"; Flags: postinstall runhidden

[Code]
var
  RequirementsPage: TOutputMsgMemoWizardPage;

procedure InitializeWizard;
var
  NodeInstalled, PostgreSQLInstalled: Boolean;
  MissingItems: String;
begin
  RequirementsPage := CreateOutputMsgMemoPage(wpWelcome,
    'System Requirements', 
    'Please ensure the following software is installed:',
    'This installer requires the following software to be installed on your system. ' +
    'Please install them before continuing if they are not already installed.');

  MissingItems := '';
  
  // Check Node.js
  NodeInstalled := DirExists(ExpandConstant('{pf}\nodejs')) or 
                   DirExists(ExpandConstant('{pf64}\nodejs')) or
                   RegKeyExists(HKLM, 'SOFTWARE\Node.js') or
                   RegKeyExists(HKLM64, 'SOFTWARE\Node.js');
  
  if not NodeInstalled then
    MissingItems := MissingItems + '• Node.js 18 or later' + #13#10 +
                    '  Download: https://nodejs.org/' + #13#10#13#10;
  
  // Check PostgreSQL
  PostgreSQLInstalled := DirExists(ExpandConstant('{pf}\PostgreSQL')) or
                         DirExists(ExpandConstant('{pf64}\PostgreSQL')) or
                         RegKeyExists(HKLM, 'SOFTWARE\PostgreSQL') or
                         RegKeyExists(HKLM64, 'SOFTWARE\PostgreSQL');
  
  if not PostgreSQLInstalled then
    MissingItems := MissingItems + '• PostgreSQL 16' + #13#10 +
                    '  Download: https://www.postgresql.org/download/windows/' + #13#10#13#10;
  
  if MissingItems <> '' then
  begin
    RequirementsPage.RichEditViewer.Lines.Add('⚠ MISSING REQUIREMENTS:');
    RequirementsPage.RichEditViewer.Lines.Add('');
    RequirementsPage.RichEditViewer.Lines.Add(MissingItems);
    RequirementsPage.RichEditViewer.Lines.Add('IMPORTANT: Please install the missing software first!');
    RequirementsPage.RichEditViewer.Lines.Add('');
    RequirementsPage.RichEditViewer.Lines.Add('After installation completes:');
    RequirementsPage.RichEditViewer.Lines.Add('1. Install Node.js and PostgreSQL');
    RequirementsPage.RichEditViewer.Lines.Add('2. Restart this installer OR');
    RequirementsPage.RichEditViewer.Lines.Add('3. Manually run post-install.bat from installation folder');
    RequirementsPage.RichEditViewer.Lines.Add('4. Run quick-setup-db.bat to create the database');
    RequirementsPage.RichEditViewer.Lines.Add('5. Use run.bat to start the system');
  end
  else
  begin
    RequirementsPage.RichEditViewer.Lines.Add('✓ All requirements are installed!');
    RequirementsPage.RichEditViewer.Lines.Add('');
    RequirementsPage.RichEditViewer.Lines.Add('After installation completes:');
    RequirementsPage.RichEditViewer.Lines.Add('1. Post-install script will run automatically');
    RequirementsPage.RichEditViewer.Lines.Add('2. Then run quick-setup-db.bat to setup database');
    RequirementsPage.RichEditViewer.Lines.Add('3. Use run.bat to start the system');
    RequirementsPage.RichEditViewer.Lines.Add('');
    RequirementsPage.RichEditViewer.Lines.Add('Access the system at:');
    RequirementsPage.RichEditViewer.Lines.Add('• Local: http://localhost:4001');
    RequirementsPage.RichEditViewer.Lines.Add('• Network: http://[YOUR-IP]:4001');
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  // Skip requirements page if everything is installed
  if PageID = RequirementsPage.ID then
  begin
    Result := DirExists(ExpandConstant('{pf}\nodejs')) and 
              DirExists(ExpandConstant('{pf}\PostgreSQL'));
  end
  else
    Result := False;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Additional post-install actions can be added here
  end;
end;

[UninstallRun]
Filename: "{app}\stop-system.bat"; RunOnceId: "StopGymSystem"; Flags: runhidden skipifdoesntexist

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\.next"
Type: files; Name: "{app}\*.log"

[Messages]
WelcomeLabel2=This will install [name/ver] on your computer.%n%nThe application requires Node.js and PostgreSQL to be installed.%n%nIt is recommended that you close all other applications before continuing.