import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  Badge,
} from '@verbatim/ui';
import { FolderOpen, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../stores/app-store';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const version = useAppStore((state) => state.version);
  const platform = useAppStore((state) => state.platform);
  const paths = useAppStore((state) => state.paths);
  const services = useAppStore((state) => state.services);
  const servicesLoading = useAppStore((state) => state.servicesLoading);
  const refreshServices = useAppStore((state) => state.refreshServices);

  const handleOpenPath = async (path: string) => {
    if (typeof window.electronAPI !== 'undefined') {
      await window.electronAPI.shell.openPath(path);
    }
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'starting':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500">Running</Badge>;
      case 'starting':
        return <Badge variant="secondary">Starting</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Stopped</Badge>;
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Verbatim Studio looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color scheme
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transcription */}
        <Card>
          <CardHeader>
            <CardTitle>Transcription</CardTitle>
            <CardDescription>Configure transcription settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Default Model</Label>
                <p className="text-sm text-muted-foreground">Model used for transcription</p>
              </div>
              <Select defaultValue="whisper-small">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whisper-tiny">Tiny (Fast)</SelectItem>
                  <SelectItem value="whisper-base">Base</SelectItem>
                  <SelectItem value="whisper-small">Small</SelectItem>
                  <SelectItem value="whisper-medium">Medium</SelectItem>
                  <SelectItem value="whisper-large-v3">Large v3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Speaker Diarization</Label>
                <p className="text-sm text-muted-foreground">
                  Identify different speakers in recordings
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Voice Inflection Analysis</Label>
                <p className="text-sm text-muted-foreground">
                  Analyze pitch, emotion, and speech patterns
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-punctuation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically add punctuation to transcripts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Services</CardTitle>
                <CardDescription>Status of transcription services</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => refreshServices()}
                disabled={servicesLoading}
              >
                <RefreshCw className={`h-4 w-4 ${servicesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {Object.keys(services).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No services configured. Services will be available when running in Electron.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(services).map(([key, service]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getServiceStatusIcon(service.status)}
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.port && (
                          <p className="text-xs text-muted-foreground">Port: {service.port}</p>
                        )}
                        {service.error && (
                          <p className="text-xs text-destructive">{service.error}</p>
                        )}
                      </div>
                    </div>
                    {getServiceStatusBadge(service.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>Manage local storage and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paths ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>App Data</Label>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {paths.appData}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPath(paths.appData)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Recordings</Label>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {paths.recordings}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPath(paths.recordings)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Exports</Label>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {paths.exports}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPath(paths.exports)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Models</Label>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {paths.models}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPath(paths.models)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Database</Label>
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        {paths.database}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenPath(paths.appData)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Storage paths will be available when running in Electron.
              </p>
            )}
          </CardContent>
        </Card>

        {/* License */}
        <Card>
          <CardHeader>
            <CardTitle>License</CardTitle>
            <CardDescription>Your license information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Tier:</span> Basic
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upgrade to Enterprise for team features
                  </p>
                </div>
                <Badge>Basic</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Application information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">{version || 'Development'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium capitalize">{platform || 'Web'}</span>
              </div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                Verbatim Studio - Privacy-first transcription for professionals.
                <br />
                Built with Electron, React, and AI-powered transcription.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
