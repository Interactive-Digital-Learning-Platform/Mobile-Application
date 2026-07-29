import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import { X, Sparkles, Plus, Minus } from "lucide-react-native";
import { SUBJECTS } from "@/constants/quizStyles";


export interface QuizConfig {
  subject: string;
  questions: number;
  timer: number;
}

interface CreateQuizModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (config: QuizConfig) => void;
}

export default function CreateQuizModal({ visible, onClose, onGenerate }: CreateQuizModalProps) {
  const [subject, setSubject] = useState("Mathematics");
  const [questions, setQuestions] = useState(10);
  const [timer, setTimer] = useState(10);
  const [timerCustomized, setTimerCustomized] = useState(false);

  useEffect(() => {
    if (!timerCustomized) {
      setTimer(questions);
    }
  }, [questions, timerCustomized]);

  useEffect(() => {
    if (!visible) {
      setSubject("Mathematics");
      setQuestions(10);
      setTimer(10);
      setTimerCustomized(false);
    }
  }, [visible]);

  const adjustQuestions = (delta: number) => {
    setQuestions((prev) => Math.max(10, Math.min(30, prev + delta)));
  };

  const adjustTimer = (delta: number) => {
    setTimerCustomized(true);
    setTimer((prev) => Math.max(1, Math.min(60, prev + delta)));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-[32px] px-6 pt-6 pb-10">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-black text-slate-800">Create Quiz</Text>
            <TouchableOpacity
              className="w-8 h-8 rounded-full bg-slate-100 justify-center items-center"
              activeOpacity={0.7}
              onPress={onClose}
            >
              <X size={16} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Subject
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
            {SUBJECTS.map((s) => (
              <TouchableOpacity
                key={s}
                className={`mr-2 px-4 py-2 rounded-xl border ${
                  subject === s ? "bg-primary border-primary" : "bg-white border-slate-200"
                }`}
                activeOpacity={0.8}
                onPress={() => setSubject(s)}
              >
                <Text className={`text-xs font-semibold ${subject === s ? "text-white" : "text-slate-600"}`}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Number of Questions
          </Text>
          <View className="flex-row items-center gap-4 mb-5">
            <TouchableOpacity
              className="w-10 h-10 rounded-xl bg-slate-100 justify-center items-center"
              activeOpacity={0.7}
              onPress={() => adjustQuestions(-1)}
            >
              <Minus size={16} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Text className="text-3xl font-black text-slate-800">{questions}</Text>
              <Text className="text-[10px] text-slate-400">min 10 · max 30</Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-xl bg-slate-100 justify-center items-center"
              activeOpacity={0.7}
              onPress={() => adjustQuestions(1)}
            >
              <Plus size={16} color="#64748b" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between mb-7">
            <View>
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Timer
              </Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">
                {timerCustomized ? "Custom" : "Auto · 1 min / question"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                className="w-9 h-9 rounded-xl bg-slate-100 justify-center items-center"
                activeOpacity={0.7}
                onPress={() => adjustTimer(-1)}
              >
                <Minus size={14} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
              <Text className="text-base font-black text-slate-800 w-16 text-center">
                {timer} min
              </Text>
              <TouchableOpacity
                className="w-9 h-9 rounded-xl bg-slate-100 justify-center items-center"
                activeOpacity={0.7}
                onPress={() => adjustTimer(1)}
              >
                <Plus size={14} color="#64748b" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="text-[10px] text-slate-400 text-center mb-3">
            Lesson and difficulty are picked automatically by AI based on your progress.
          </Text>

          <TouchableOpacity
            className="bg-primary flex-row justify-center items-center gap-2 py-4 rounded-2xl shadow-lg shadow-primary/30"
            activeOpacity={0.85}
            onPress={() => {
              onGenerate({ subject, questions, timer });
              onClose();
            }}
          >
            <Sparkles size={18} color="#fff" strokeWidth={2} />
            <Text className="text-white font-black text-base">Generate Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
