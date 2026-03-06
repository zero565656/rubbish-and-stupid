import { useState } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export const SearchBar = ({ onSearch, placeholder = "Search for specific nonsense..." }: SearchBarProps) => {
    const [query, setQuery] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query);
    };

    const handleClear = () => {
        setQuery("");
        onSearch("");
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#fdfbf6]/60" />
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-12 pr-12 py-4 border-2 border-[#1a4c3b] bg-[#1a4c3b] text-[#fdfbf6] text-base placeholder:text-[#fdfbf6]/50 focus:outline-none focus:ring-0 focus:border-[#111111]"
            />
            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#fdfbf6]/60 hover:text-[#fdfbf6] transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </form>
    );
};
