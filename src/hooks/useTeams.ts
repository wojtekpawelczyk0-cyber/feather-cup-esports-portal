import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TeamMember {
  id: string;
  nickname: string;
  role: 'player' | 'reserve' | 'coach';
  position: string | null;
  steam_id: string | null;
  avatar_url: string | null;
}

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  status: 'preparing' | 'ready' | 'registered';
  is_paid: boolean;
  owner_id: string | null;
  members?: TeamMember[];
}

interface TeamWithMemberCount extends Team {
  memberCount: number;
}

export const useTeams = () => {
  const [teams, setTeams] = useState<TeamWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Fetch teams with member count using a join
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            team_members(id)
          `)
          .order('name', { ascending: true });

        if (teamsError) throw teamsError;

        // Map teams with their member counts
        const teamsWithCounts = (teamsData || []).map((team: any) => ({
          ...team,
          memberCount: team.team_members?.length || 0,
          team_members: undefined, // Remove the nested array
        }));

        setTeams(teamsWithCounts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return { teams, loading, error };
};

export const useTeamDetails = (teamId: string | undefined) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchTeamDetails = async () => {
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .maybeSingle();

        if (teamError) throw teamError;
        setTeam(teamData);

        if (teamData) {
          const { data: membersData, error: membersError } = await supabase
            .from('team_members')
            .select('*')
            .eq('team_id', teamId)
            .order('role', { ascending: true });

          if (membersError) throw membersError;
          setMembers(membersData || []);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [teamId]);

  return { team, members, loading, error };
};
