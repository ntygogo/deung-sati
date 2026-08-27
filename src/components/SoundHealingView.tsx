import React, { useState, useEffect } from 'react';
import { soundEngine, type SoundTrack } from '../services/soundEngine';
import { Play, Pause, Volume2, Clock, Square, Sparkles } from 'lucide-react';

export const SoundHealingView: React.FC = () => {
  const [tracks, setTracks] = useState<SoundTrack[]>(soundEngine.tracks);
  const [masterVolume, setMasterVolume] = useState<number>(0.8);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [selectedTimerOption, setSelectedTimerOption] = useState<number | null>(null);

  const activeTracksCount = tracks.filter((t) => t.isPlaying).length;

  useEffect(() => {
    // Check initial timer
    setTimerRemaining(soundEngine.getTimerRemaining());
  }, []);

  const handleToggleTrack = (trackId: string) => {
    soundEngine.toggleTrack(trackId);
    setTracks([...soundEngine.tracks]);
  };

  const handleVolumeChange = (trackId: string, vol: number) => {
    soundEngine.setTrackVolume(trackId, vol);
    setTracks([...soundEngine.tracks]);
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    soundEngine.setMasterVolume(vol);
  };

  const handleStopAll = () => {
    soundEngine.stopAll();
    setTracks([...soundEngine.tracks]);
    setSelectedTimerOption(null);
    setTimerRemaining(0);
  };

  const handleSetTimer = (minutes: number) => {
    if (selectedTimerOption === minutes) {
      soundEngine.clearSleepTimer();
      setSelectedTimerOption(null);
      setTimerRemaining(0);
    } else {
      setSelectedTimerOption(minutes);
      soundEngine.setSleepTimer(minutes, (seconds) => {
        setTimerRemaining(seconds);
        if (seconds <= 0) {
          setTracks([...soundEngine.tracks]);
          setSelectedTimerOption(null);
        }
      });
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="sound-healing-container">
      {/* Header Banner */}
      <div className="sound-header-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="sound-heading">เสียงบำบัด & เสียงธรรมชาติ</h3>
            <p className="sound-subheading">สร้างความถี่สงบและตัดเสียงรบกวนในหัว</p>
          </div>
          {activeTracksCount > 0 && (
            <button className="btn-stop-all" onClick={handleStopAll}>
              <Square size={14} />
              <span>หยุดทั้งหมด ({activeTracksCount})</span>
            </button>
          )}
        </div>

        {/* Master Volume & Sleep Timer Bar */}
        <div className="sound-master-bar">
          <div className="master-vol-control">
            <Volume2 size={16} className="text-secondary" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
              className="custom-range-slider"
              title="ระดับเสียงรวม"
            />
          </div>

          {/* Sleep Timer Chips */}
          <div className="sleep-timer-chips">
            <Clock size={14} className="text-secondary" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {timerRemaining > 0 ? `ปิดใน ${formatTimer(timerRemaining)}` : 'ตั้งเวลาปิด:'}
            </span>
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                className={`timer-chip ${selectedTimerOption === mins ? 'active' : ''}`}
                onClick={() => handleSetTimer(mins)}
              >
                {mins} น.
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="sound-tracks-grid">
        {tracks.map((track) => (
          <div key={track.id} className={`sound-track-card ${track.isPlaying ? 'playing' : ''}`}>
            <div className="track-header">
              <div className="track-title-group">
                <span className="track-name">{track.name}</span>
                <span className="track-freq-badge">{track.frequencyLabel}</span>
              </div>
              <button
                className={`track-play-btn ${track.isPlaying ? 'active' : ''}`}
                onClick={() => handleToggleTrack(track.id)}
                title={track.isPlaying ? 'หยุดเสียง' : 'เล่นเสียง'}
              >
                {track.isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>

            <p className="track-desc">{track.description}</p>

            {/* Individual Volume Slider */}
            {track.isPlaying && (
              <div className="track-vol-row">
                <Volume2 size={13} className="text-muted" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.volume}
                  onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                  className="custom-range-slider track-slider"
                />
                <span className="track-vol-num">{Math.round(track.volume * 100)}%</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tip Card */}
      <div className="gentle-tip-card">
        <Sparkles size={16} className="text-primary" />
        <span>
          💡 <strong>เคล็ดลับ:</strong> คุณสามารถเปิด <strong>432 Hz</strong> ผสมกับ <strong>สายฝน</strong> หรือ <strong>คลื่นทะเล</strong> พร้อมกัน เพื่อสร้างบรรยากาศสงบเฉพาะตัวได้ครับ
        </span>
      </div>
    </div>
  );
};
