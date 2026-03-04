import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Profile, Submission } from "@/types/database.types";
import { useAuth } from "@/contexts/AuthContext";

interface AssignReviewerModalProps {
    submission: Submission;
    onClose: () => void;
    onAssigned: () => void;
}

const AssignReviewerModal = ({ submission, onClose, onAssigned }: AssignReviewerModalProps) => {
    const { user } = useAuth();
    const [reviewers, setReviewers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReviewer, setSelectedReviewer] = useState<string>("");
    const [deadline, setDeadline] = useState<string>("");
    const [assigning, setAssigning] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchReviewers();
    }, []);

    const fetchReviewers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "reviewer")
            .eq("is_active", true);

        if (!error && data) {
            setReviewers(data as Profile[]);
        }
        setLoading(false);
    };

    const filteredReviewers = reviewers.filter((r) => {
        const query = searchQuery.toLowerCase();
        return (
            r.full_name?.toLowerCase().includes(query) ||
            r.institution?.toLowerCase().includes(query) ||
            r.research_field?.toLowerCase().includes(query)
        );
    });

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReviewer || !user) return;

        setAssigning(true);
        try {
            const { error } = await supabase.from("reviewer_assignments").insert({
                submission_id: submission.id,
                reviewer_id: selectedReviewer,
                assigned_by: user.id,
                status: "pending",
                deadline: deadline || null,
            });

            if (error) throw error;

            // Create notification for the reviewer
            await supabase.from("notifications").insert({
                user_id: selectedReviewer,
                type: "reviewer_assigned",
                title: "New Review Assignment",
                message: `You have been assigned to review: ${submission.title}`,
                related_id: submission.id,
            });

            toast.success("Reviewer assigned successfully");
            onAssigned();
            onClose();
        } catch (error: any) {
            toast.error(`Failed to assign reviewer: ${error.message}`);
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-border">
                    <h3 className="font-serif text-xl text-foreground">
                        Assign Reviewer
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                        {submission.title}
                    </p>
                </div>

                <form onSubmit={handleAssign} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Search */}
                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Search Reviewers
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, institution, or field..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Reviewer List */}
                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Select Reviewer *
                        </label>
                        {loading ? (
                            <p className="text-muted-foreground text-sm animate-pulse">Loading reviewers...</p>
                        ) : filteredReviewers.length === 0 ? (
                            <p className="text-muted-foreground text-sm">No reviewers found.</p>
                        ) : (
                            <div className="max-h-48 overflow-y-auto border border-border">
                                {filteredReviewers.map((reviewer) => (
                                    <label
                                        key={reviewer.id}
                                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted transition-colors ${
                                            selectedReviewer === reviewer.id ? "bg-primary/10" : ""
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="reviewer"
                                            value={reviewer.id}
                                            checked={selectedReviewer === reviewer.id}
                                            onChange={(e) => setSelectedReviewer(e.target.value)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {reviewer.full_name || "Anonymous"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {reviewer.institution || "No institution"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {reviewer.research_field || "No field specified"}
                                            </p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <label className="block text-xs font-sans uppercase tracking-widest font-semibold text-foreground">
                            Review Deadline (Optional)
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </form>

                <div className="p-6 border-t border-border flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-secondary text-secondary-foreground text-xs uppercase tracking-widest px-4 py-3 border border-border hover:bg-secondary/80"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={!selectedReviewer || assigning}
                        className="flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-4 py-3 hover:bg-primary/90 disabled:opacity-50"
                    >
                        {assigning ? "Assigning..." : "Assign Reviewer"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignReviewerModal;
