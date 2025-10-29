// ... imports ...

useEffect(() => {
  const checkSession = async () => {
    const {  { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };
  checkSession();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user || null);
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);

// ... rest of your component ...
