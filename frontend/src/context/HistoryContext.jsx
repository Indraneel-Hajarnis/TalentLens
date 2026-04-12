import { createContext, useContext, useState, useEffect, useCallback } from "react";

const HistoryContext = createContext();

export function HistoryProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [historyRes, userRes] = await Promise.all([
        fetch("http://localhost:3000/api/history", { credentials: "include" }),
        fetch("http://localhost:3000/api/me", { credentials: "include" })
      ]);

      if (historyRes.status === 401) {
        setHistory([]);
        setUser(null);
        return;
      }

      const historyData = await historyRes.json();
      setHistory(historyData);

      if (userRes.ok) {
        setUser(await userRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch history or user", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <HistoryContext.Provider value={{ history, loadingHistory, user, refreshHistory: fetchHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export const useHistory = () => useContext(HistoryContext);
