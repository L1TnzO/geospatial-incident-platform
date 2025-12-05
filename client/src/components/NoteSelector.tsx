import { useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { X, Plus, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';

export interface IncidentNote {
    author: string;
    note: string;
    createdAt: string;
}

interface NoteSelectorProps {
    notes: IncidentNote[];
    onChange: (notes: IncidentNote[]) => void;
}

export function NoteSelector({ notes = [], onChange }: NoteSelectorProps) {
    const [newNote, setNewNote] = useState<IncidentNote>({
        author: 'Operator',
        note: '',
        createdAt: ''
    });

    const handleAdd = () => {
        if (!newNote.note.trim()) {
            toast.warning("Note content is required");
            return;
        }
        const noteToAdd = {
            ...newNote,
            createdAt: new Date().toISOString()
        };
        onChange([...notes, noteToAdd]);
        setNewNote({ ...newNote, note: '', createdAt: '' });
    };

    const handleRemove = (index: number) => {
        const updated = [...notes];
        updated.splice(index, 1);
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <Label>Field Notes</Label>
                <span className="text-xs text-muted-foreground">{notes.length} notes</span>
            </div>
            <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/20">
                <div className="flex gap-2">
                    <div className="w-1/3">
                        <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Author</Label>
                        <div className="relative">
                            <User className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                            <Input className="h-8 text-xs pl-7" placeholder="Name" value={newNote.author} onChange={(e) => setNewNote({ ...newNote, author: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex-1">
                        <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Note Content</Label>
                        <Textarea className="min-h-[32px] h-8 text-xs py-1 resize-none" placeholder="Enter observations..." value={newNote.note} onChange={(e) => setNewNote({ ...newNote, note: e.target.value })} />
                    </div>
                    <div className="flex items-end">
                        <Button type="button" size="sm" className="h-8 px-3" onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                    </div>
                </div>
            </div>
            {notes.length > 0 && (
                <ScrollArea className="h-[120px] rounded-md border">
                    <div className="divide-y">
                        {notes.map((note, idx) => (
                            <div key={idx} className="p-3 text-sm flex gap-3 hover:bg-muted/10 group">
                                <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-xs text-primary">{note.author}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-xs text-foreground/90">{note.note}</p>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => handleRemove(idx)}><X className="h-3 w-3" /></Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );
}