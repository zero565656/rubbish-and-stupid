import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database.types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    role: UserRole | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isAdmin: boolean;
    isEditor: boolean;
    isReviewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setLoading(true);
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setProfile(data as Profile);
        } else {
            setProfile(null);
        }
        setLoading(false);
    };

    const refreshProfile = async () => {
        if (!user?.id) return;
        setLoading(true);
        await fetchProfile(user.id);
    };

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();
        const { error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
        });
        if (error) {
            setLoading(false);
        }
        return { error: error as Error | null };
    };

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
    };

    const value: AuthContextType = {
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        isAdmin: profile?.role === 'admin',
        isEditor: profile?.role === 'editor',
        isReviewer: profile?.role === 'reviewer',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
