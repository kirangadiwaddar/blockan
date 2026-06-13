"use client";

import { useState } from "react";
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
  onCreated?: (project: Project) => void;
}

export function CreateProjectSheet({ open, onOpenChange, onCreated }: Props) {
  const [name, setName]   = useState("");
  const [key, setKey]     = useState("");
  const [desc, setDesc]   = useState("");
  const [color, setColor] = useState("avatar-orb-blue");

  const canSubmit = name.trim() && key.trim();

  const handleCreate = () => {
    if (!canSubmit) return;
    const project: Project = {
      id:          key.toLowerCase().replace(/\s+/g, "-"),
      key:         key.toUpperCase().slice(0, 6),
      code:        `${key.toUpperCase().slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`,
      name:        name.trim(),
      description: desc.trim() || `${name.trim()} project`,
      color,
      members:     [],
      openIssues:  0,
      totalIssues: 0,
      progress:    0,
      updatedAt:   new Date().toISOString().slice(0, 10),
      status:      "active",
    };
    onCreated?.(project);
    setName(""); setKey(""); setDesc(""); setColor("avatar-orb-blue");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Create Project</SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-5 px-6 py-5 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="proj-name">Project name *</Label>
            <Input
              id="proj-name"
              placeholder="e.g. Phoenix App"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                const prefix = val.replace(/\s+/g, "").slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
                const suffix = Math.floor(1000 + Math.random() * 9000);
                setKey(`${prefix}-${suffix}`);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="proj-key">Key *</Label>
            <Input
              id="proj-key"
              placeholder="e.g. SUP-7865"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 10))}
              className="uppercase"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Short identifier used in issue codes</p>
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

        <SheetFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button className="cursor-pointer" onClick={handleCreate} disabled={!canSubmit}>
            Create Project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
