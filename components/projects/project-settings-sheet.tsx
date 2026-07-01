"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useProjects } from "@/lib/projects-context";

const COLORS = [
  { label: "Blue",    value: "avatar-orb-blue"    },
  { label: "Violet",  value: "avatar-orb-violet"  },
  { label: "Pink",    value: "avatar-orb-pink"    },
  { label: "Amber",   value: "avatar-orb-amber"   },
  { label: "Emerald", value: "avatar-orb-emerald" },
  { label: "Cyan",    value: "avatar-orb-cyan"    },
  { label: "Rose",    value: "avatar-orb-rose"    },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

export function ProjectSettingsSheet({ open, onOpenChange, project }: Props) {
  const { updateProject } = useProjects();
  const [name, setName]   = useState(project.name);
  const [desc, setDesc]   = useState(project.description ?? "");
  const [color, setColor] = useState(project.color);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(project.name);
      setDesc(project.description ?? "");
      setColor(project.color);
    }
  }, [open, project]);

  const dirty = name.trim() !== project.name || desc.trim() !== (project.description ?? "") || color !== project.color;
  const canSave = name.trim().length > 0 && dirty;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await updateProject(project.id, {
      name: name.trim(),
      description: desc.trim(),
      color,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md">
        <SheetHeader className="px-6 py-3.5 border-b">
          <SheetTitle>Project Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          {/* Key — read-only, changing it would break all issue codes */}
          <div className="flex flex-col gap-2">
            <Label>Key</Label>
            <Input value={project.key} disabled className="bg-muted/40 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">The project key cannot be changed after creation.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="proj-name">Project name *</Label>
            <Input
              id="proj-name"
              placeholder="e.g. Phoenix App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="proj-desc">Description</Label>
            <Textarea
              id="proj-desc"
              placeholder="What is this project about?"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`avatar-orb ${c.value} size-7 rounded-full cursor-pointer ring-offset-2 ${
                    color === c.value ? "ring-2 ring-foreground" : ""
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer" disabled={saving}>
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={handleSave} disabled={!canSave || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
