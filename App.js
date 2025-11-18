import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = '<REPLACE_WITH_SUPABASE_URL>';
const SUPABASE_ANON_KEY = '<REPLACE_WITH_ANON_KEY>';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(()=>{ init(); }, []);

  async function init(){
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await fetchPosts();
    // Realtime
    const subscription = supabase.channel('post-ch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, payload => {
        fetchPosts();
      })
      .subscribe();
    return ()=> supabase.removeChannel(subscription);
  }

  async function fetchPosts(){
    setLoading(true);
    const { data, error } = await supabase.from('posts').select('*, profiles(username)').order('created_at', { ascending:false }).limit(50);
    if (!error) setPosts(data || []);
    setLoading(false);
  }

  async function signIn() {
    const email = prompt('Enter email'); // on mobile prompt may not work; replace with UI for production.
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert('Check your email for the magic link');
  }

  async function createPost(){
    if (!session) return alert('Sign in first');
    if (!content.trim()) return;
    await supabase.from('posts').insert({ user_id: session.user.id, content: content.trim() });
    setContent('');
    fetchPosts();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>TradeHub Mobile</Text>
        {session ? (<Button title="Sign out" onPress={()=>supabase.auth.signOut().then(()=>setSession(null))} />) : (<Button title="Sign in" onPress={signIn} />)}
      </View>

      <View style={styles.card}>
        <TextInput style={styles.input} placeholder="Share trading idea..." value={content} onChangeText={setContent} multiline />
        <Button title="Post" onPress={createPost} />
      </View>

      <FlatList data={posts} keyExtractor={p=>p.id} renderItem={({item})=>(
        <View style={styles.post}>
          <Text style={styles.username}>{item.profiles?.username || 'Trader'}</Text>
          <Text style={styles.postContent}>{item.content}</Text>
          <Text style={styles.small}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, padding:12, backgroundColor:'#071028' },
  center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  title:{color:'#e6eef6',fontSize:18,fontWeight:'700'},
  card:{backgroundColor:'#0b1420',padding:10,borderRadius:8,marginBottom:12},
  input:{color:'#fff',minHeight:60},
  post:{backgroundColor:'#071a28',padding:10,borderRadius:8,marginBottom:8},
  username:{color:'#9ae6f7',fontWeight:'700'},
  postContent:{color:'#e6eef6',marginTop:6},
  small:{color:'#94a3b8',fontSize:12,marginTop:6}
});
