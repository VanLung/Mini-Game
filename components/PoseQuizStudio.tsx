"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ANSWERS,
  DEFAULT_POSE_QUESTIONS,
  POSE_LABELS,
  POSE_SESSION_KEY,
  type AnswerKey,
  type PoseQuestion,
  createPoseQuestion,
  loadPoseQuestions,
  savePoseQuestions,
  sanitizePoseQuestions,
  validatePoseQuestions,
} from "../lib/poseQuiz";

export function PoseQuizStudio() {
  const [questions, setQuestions] = useState<PoseQuestion[]>(DEFAULT_POSE_QUESTIONS);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setQuestions(loadPoseQuestions());
    setLoaded(true);
  }, []);

  const validQuestionCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.prompt.trim() &&
          ANSWERS.every((answer) => question.options[answer].trim()),
      ).length,
    [questions],
  );

  const updateQuestion = (id: string, patch: Partial<PoseQuestion>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    );
  };

  const updateOption = (id: string, key: AnswerKey, value: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id
          ? { ...question, options: { ...question.options, [key]: value } }
          : question,
      ),
    );
  };

  const save = () => {
    const cleaned = sanitizePoseQuestions(questions);
    const validation = validatePoseQuestions(cleaned);
    if (validation) {
      setError(validation);
      return null;
    }
    try {
      const saved = savePoseQuestions(cleaned);
      setQuestions(saved);
      setError("");
      return saved;
    } catch {
      setError("Không thể lưu câu hỏi trên trình duyệt này.");
      return null;
    }
  };

  const launchPresenter = () => {
    const saved = save();
    if (!saved) return;

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);

    try {
      window.localStorage.setItem(
        POSE_SESSION_KEY,
        JSON.stringify({ sessionId, createdAt: Date.now() }),
      );
    } catch {
      // Session still works through the URL.
    }

    const display = window.open(
      "/pose-quiz/display?session=" + encodeURIComponent(sessionId),
      "pose-quiz-display-" + sessionId,
      "popup=yes,width=1280,height=800",
    );

    if (!display) {
      setError(
        "Trình duyệt đang chặn cửa sổ trình chiếu. Hãy cho phép pop-up cho website rồi bấm lại.",
      );
      return;
    }

    display.focus();
    window.location.href =
      "/pose-quiz/control?session=" + encodeURIComponent(sessionId);
  };

  return (
    <main className="pose-studio-shell">
      <Link className="game-back-link" href="/">← Game Hub</Link>

      <section className="pose-studio">
        <header className="pose-studio-header">
          <div>
            <p>AI VISION · PRESENTER MODE V2</p>
            <h1>Pose Quiz AI</h1>
            <span>
              Chuẩn bị câu hỏi trên laptop. Khi bắt đầu, game mở một cửa sổ riêng
              cho TV; đáp án đúng và công cụ giáo viên chỉ nằm ở Teacher Console.
            </span>
          </div>
          <div className="pose-ai-badge">
            <strong>2X</strong>
            <span>TEACHER + TV</span>
          </div>
        </header>

        <section className="pose-presenter-help">
          <article>
            <b>01</b>
            <div>
              <strong>Windows: Win + P → Extend</strong>
              <span>Không dùng Duplicate/Mirror nếu muốn TV hiển thị nội dung khác laptop.</span>
            </div>
          </article>
          <article>
            <b>02</b>
            <div>
              <strong>Bấm “Bắt đầu Presenter Mode”</strong>
              <span>Game mở Student Display ở cửa sổ riêng; kéo cửa sổ đó sang TV.</span>
            </div>
          </article>
          <article>
            <b>03</b>
            <div>
              <strong>Laptop giữ Teacher Console</strong>
              <span>Đáp án đúng, Pause, Next, Skip và trạng thái AI chỉ giáo viên nhìn thấy.</span>
            </div>
          </article>
        </section>

        <section className="pose-gesture-guide">
          {ANSWERS.map((answer) => (
            <article key={answer}>
              <b>{answer}</b>
              <span>{POSE_LABELS[answer].icon}</span>
              <div>
                <strong>{POSE_LABELS[answer].title}</strong>
                <small>{POSE_LABELS[answer].hint}</small>
              </div>
            </article>
          ))}
        </section>

        <div className="pose-studio-toolbar">
          <div>
            <b>Question Studio</b>
            <span>
              {validQuestionCount}/{questions.length} câu hợp lệ · chỉ lưu trên trình duyệt này
            </span>
          </div>
          <div>
            <button
              onClick={() =>
                setQuestions((current) => [...current, createPoseQuestion()])
              }
              type="button"
            >
              + Thêm câu
            </button>
            <button
              onClick={() => {
                setQuestions(DEFAULT_POSE_QUESTIONS);
                setError("");
              }}
              type="button"
            >
              Khôi phục mẫu
            </button>
            <button className="pose-save-button" onClick={save} type="button">
              Lưu câu hỏi
            </button>
          </div>
        </div>

        <div className="pose-question-editor">
          {questions.map((question, questionIndex) => (
            <article className="pose-editor-card" key={question.id}>
              <div className="pose-editor-index">
                {String(questionIndex + 1).padStart(2, "0")}
              </div>

              <label className="pose-editor-prompt">
                <span>Câu hỏi</span>
                <textarea
                  onChange={(event) =>
                    updateQuestion(question.id, { prompt: event.target.value })
                  }
                  placeholder="Nhập nội dung câu hỏi…"
                  value={question.prompt}
                />
              </label>

              <div className="pose-editor-options">
                {ANSWERS.map((answer) => (
                  <label key={answer}>
                    <b>{answer}</b>
                    <input
                      onChange={(event) =>
                        updateOption(question.id, answer, event.target.value)
                      }
                      placeholder={"Đáp án " + answer}
                      value={question.options[answer]}
                    />
                  </label>
                ))}
              </div>

              <div className="pose-editor-meta">
                <label>
                  <span>Đáp án đúng · chỉ GV thấy</span>
                  <select
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        correct: event.target.value as AnswerKey,
                      })
                    }
                    value={question.correct}
                  >
                    {ANSWERS.map((answer) => (
                      <option key={answer} value={answer}>{answer}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Thời gian</span>
                  <div>
                    <input
                      max={60}
                      min={5}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          seconds: Number(event.target.value),
                        })
                      }
                      type="number"
                      value={question.seconds}
                    />
                    <i>giây</i>
                  </div>
                </label>

                <button
                  disabled={questions.length <= 1}
                  onClick={() =>
                    setQuestions((current) =>
                      current.filter((item) => item.id !== question.id),
                    )
                  }
                  type="button"
                >
                  Xóa câu
                </button>
              </div>
            </article>
          ))}
        </div>

        {error && <p className="pose-error" role="alert">{error}</p>}

        <button
          className="pose-launch-button"
          disabled={!loaded}
          onClick={launchPresenter}
          type="button"
        >
          <span>Bắt đầu Presenter Mode</span>
          <strong>MỞ TEACHER + TV →</strong>
        </button>
      </section>
    </main>
  );
}
