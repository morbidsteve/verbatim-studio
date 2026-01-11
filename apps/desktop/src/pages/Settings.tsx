import {
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
} from '@verbatim/ui';
import { useTheme } from '../hooks/useTheme';

export function Settings() {
  const { theme, setTheme } = useTheme();

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
                <p className="text-sm text-muted-foreground">
                  Model used for transcription
                </p>
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
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>Manage local storage and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Storage Location</Label>
                <p className="text-sm text-muted-foreground">
                  Where recordings and transcripts are stored
                </p>
              </div>
              <code className="rounded bg-muted px-2 py-1 text-sm">
                ~/Documents/Verbatim
              </code>
            </div>
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
              <p className="text-sm">
                <span className="font-medium">Tier:</span> Basic
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upgrade to Enterprise for team features
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
