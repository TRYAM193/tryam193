import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, LogOut } from "lucide-react";

export default function UnsavedChangesModal({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-orange-500/10 border border-orange-500/20">
              <AlertCircle className="w-6 h-6 text-orange-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-white">
              Unsaved Changes
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-400 text-base leading-relaxed">
            You have unsaved changes in your design. Would you like to save them before leaving? 
            Leaving now will discard all unsaved work.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={onDiscard}
              className="sm:flex-1 border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white text-slate-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Anyway
            </Button>
            
            <Button
              onClick={onSave}
              disabled={isSaving}
              className="sm:flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white border-0 shadow-lg shadow-orange-950/20"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">◌</span>
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save & Exit
                </>
              )}
            </Button>
          </div>
          
          <AlertDialogCancel 
            onClick={onClose}
            className="sm:flex-none border-slate-800 bg-slate-950/50 hover:bg-slate-900 text-slate-400"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
