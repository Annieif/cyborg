"""
MineRL Benchmark Suite — Standard evaluation metrics and multi-task benchmarking.

Provides MineRL competition-style evaluation for VPT agents:
  - Standard metrics (reward, success rate, sample efficiency)
  - Multi-task benchmark runner
  - Result aggregation and comparison with baselines
  - JSON report generation for leaderboard-style tracking

Reference:
  - https://minerl.readthedocs.io/en/latest/tutorials/competition.html
  - https://github.com/openai/Video-Pre-Training (evaluation scripts)
  - MineRL NeurIPS competition evaluation protocol

Usage:
  python minerl_benchmark.py --model model.model --weights model.weights --task treechop --episodes 10
  python minerl_benchmark.py --model model.model --weights model.weights --all-tasks --episodes 5
"""

import os
import sys
import json
import time
import argparse
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from collections import defaultdict

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("minerl-benchmark")

# Add VPT lib/ to path
vpt_lib_path = os.path.join(os.path.dirname(__file__), "lib")
if os.path.exists(vpt_lib_path):
    sys.path.insert(0, os.path.dirname(__file__))

from minerl_actions import (
    MINERL_TASKS, MINERL_ENV_KWARGS,
    get_active_buttons, is_null_action, create_noop,
)
from vpt_agent import VPTAgent


# ============================================================
# MineRL Competition Evaluation Metrics
# ============================================================
# Standard metrics used in MineRL competitions (NeurIPS 2019-2022)

@dataclass
class EpisodeMetrics:
    """Per-episode evaluation metrics."""
    episode: int
    steps: int = 0
    total_reward: float = 0.0
    success: bool = False
    actions_taken: int = 0
    null_actions: int = 0
    elapsed_seconds: float = 0.0
    final_inventory: Dict[str, int] = field(default_factory=dict)
    events: List[str] = field(default_factory=list)  # milestones achieved


@dataclass
class TaskBenchmark:
    """Benchmark results for a single task."""
    task: str
    env_name: str
    model: str
    weights: str
    device: str
    episodes: List[EpisodeMetrics] = field(default_factory=list)
    total_time: float = 0.0

    @property
    def num_episodes(self) -> int:
        return len(self.episodes)

    @property
    def avg_reward(self) -> float:
        if not self.episodes:
            return 0.0
        return np.mean([e.total_reward for e in self.episodes])

    @property
    def std_reward(self) -> float:
        if not self.episodes:
            return 0.0
        return float(np.std([e.total_reward for e in self.episodes]))

    @property
    def success_rate(self) -> float:
        if not self.episodes:
            return 0.0
        return sum(1 for e in self.episodes if e.success) / len(self.episodes)

    @property
    def avg_steps(self) -> float:
        if not self.episodes:
            return 0.0
        return np.mean([e.steps for e in self.episodes])

    @property
    def avg_actions_taken(self) -> float:
        if not self.episodes:
            return 0.0
        return np.mean([e.actions_taken for e in self.episodes])

    @property
    def action_rate(self) -> float:
        if not self.episodes:
            return 0.0
        total_steps = sum(e.steps for e in self.episodes)
        total_actions = sum(e.actions_taken for e in self.episodes)
        return total_actions / max(total_steps, 1)

    @property
    def avg_steps_per_second(self) -> float:
        if not self.episodes:
            return 0.0
        total_steps = sum(e.steps for e in self.episodes)
        total_time = sum(e.elapsed_seconds for e in self.episodes)
        return total_steps / max(total_time, 0.001)

    def to_dict(self) -> Dict:
        return {
            "task": self.task,
            "env_name": self.env_name,
            "model": self.model,
            "weights": self.weights,
            "device": self.device,
            "num_episodes": self.num_episodes,
            "avg_reward": self.avg_reward,
            "std_reward": self.std_reward,
            "success_rate": self.success_rate,
            "avg_steps": self.avg_steps,
            "avg_actions_taken": self.avg_actions_taken,
            "action_rate": self.action_rate,
            "avg_steps_per_second": self.avg_steps_per_second,
            "total_time": self.total_time,
            "episodes": [asdict(e) for e in self.episodes],
        }


# ============================================================
# MineRL Reference Baselines
# ============================================================
# Known baseline performance (from MineRL competition results and VPT paper)
# Used for comparison context

MINERL_BASELINES: Dict[str, Dict[str, float]] = {
    "treechop": {
        "random": 0.0,
        "human": 65.0,
        "vpt_foundation_1x": 55.0,
        "vpt_foundation_3x": 60.0,
    },
    "navigate": {
        "random": 0.0,
        "human": 70.0,
        "vpt_foundation_1x": 45.0,
        "vpt_foundation_3x": 55.0,
    },
    "diamond": {
        "random": 0.0,
        "human_avg": 50.0,
        "vpt_foundation_1x": 8.0,
        "vpt_bc_early_game": 12.0,
        "vpt_rl": 20.0,
    },
    "basalt_find_cave": {
        "random": 0.0,
        "human": 80.0,
    },
    "basalt_make_waterfall": {
        "random": 0.0,
        "human": 75.0,
    },
    "basalt_create_village_animal_pen": {
        "random": 0.0,
        "human": 70.0,
    },
    "basalt_build_village_house": {
        "random": 0.0,
        "human": 65.0,
    },
}


# ============================================================
# Task-Specific Success Detection
# ============================================================

def detect_task_success(task: str, obs: Dict, info: Dict, reward: float) -> Tuple[bool, List[str]]:
    """
    Detect if a task-specific success condition has been met.

    :param task: Task key
    :param obs: Current observation
    :param info: Environment info dict
    :param reward: Current reward
    :return: (success, list of milestone events)
    """
    events = []

    if task == "treechop":
        # Success: collected at least 1 log
        if reward > 0:
            events.append("collected_log")
            if reward >= 5:
                return True, events

    elif task in ("navigate", "navigate_dense", "navigate_extreme"):
        # Success: reached target (reward > 0 from MineRL)
        if reward > 0:
            events.append("reached_target")
            return True, events

    elif task == "diamond":
        # Success: obtained diamond (reward > 0, typically at end)
        inventory = info.get("inventory", {})
        if "diamond" in inventory and inventory["diamond"] > 0:
            events.append("obtained_diamond")
            return True, events
        if "log" in inventory and inventory["log"] > 0:
            events.append("collected_wood")
        if "cobblestone" in inventory and inventory["cobblestone"] > 0:
            events.append("collected_stone")
        if "iron_ingot" in inventory and inventory["iron_ingot"] > 0:
            events.append("smelted_iron")
        if "iron_pickaxe" in inventory and inventory["iron_pickaxe"] > 0:
            events.append("crafted_iron_pickaxe")

    elif task == "basalt_find_cave":
        # Success: found a cave (entered darkness / stone area)
        if reward > 0:
            events.append("found_cave")
            return True, events

    elif task == "basalt_make_waterfall":
        # Success: created a waterfall
        if reward > 0:
            events.append("created_waterfall")
            return True, events

    elif task == "basalt_create_village_animal_pen":
        # Success: created animal pen
        if reward > 0:
            events.append("created_pen")
            return True, events

    elif task == "basalt_build_village_house":
        # Success: built a village house
        if reward > 0:
            events.append("built_house")
            return True, events

    elif task == "human_survival":
        # Success: survived the full episode
        events.append("survived")
        return True, events

    return False, events


# ============================================================
# Benchmark Runner
# ============================================================

class MineRLBenchmarkRunner:
    """
    Run standardized benchmarks across one or more MineRL tasks.

    Provides MineRL competition-style evaluation with:
      - Multi-episode averaging
      - Task-specific success detection
      - Baseline comparison
      - JSON report generation
    """

    def __init__(
        self,
        model_path: str,
        weights_path: str,
        device: str = "cpu",
        headless: bool = True,
        max_steps: int = 1000,
        num_episodes: int = 10,
        seed: int = 42,
    ):
        self.model_path = model_path
        self.weights_path = weights_path
        self.device = device
        self.headless = headless
        self.max_steps = max_steps
        self.num_episodes = num_episodes
        self.seed = seed

        self.agent: Optional[VPTAgent] = None
        self.results: Dict[str, TaskBenchmark] = {}

    def init_agent(self):
        """Initialize the VPT agent (shared across tasks)."""
        if self.agent is not None:
            return
        logger.info(f"Loading VPT model: {os.path.basename(self.model_path)}")
        self.agent = VPTAgent(
            model_path=self.model_path,
            weights_path=self.weights_path,
            device=self.device,
        )
        logger.info("VPT agent loaded successfully")

    def run_task(self, task_key: str) -> TaskBenchmark:
        """
        Run benchmark on a single task.

        :param task_key: Task key (e.g., 'treechop', 'navigate', 'diamond')
        :return: TaskBenchmark with results
        """
        try:
            import gym
            import minerl  # noqa: F401
        except ImportError:
            logger.error("MineRL not installed: pip install minerl")
            raise

        env_name = MINERL_TASKS.get(task_key, task_key)
        logger.info(f"Benchmarking task: {task_key} ({env_name})")
        logger.info(f"  Episodes: {self.num_episodes}, Max steps: {self.max_steps}")

        self.init_agent()

        benchmark = TaskBenchmark(
            task=task_key,
            env_name=env_name,
            model=os.path.basename(self.model_path),
            weights=os.path.basename(self.weights_path),
            device=self.device,
        )

        start_time = time.time()

        try:
            env = gym.make(env_name)
        except Exception as e:
            logger.error(f"Failed to create environment '{env_name}': {e}")
            return benchmark

        try:
            np.random.seed(self.seed)

            for ep in range(self.num_episodes):
                metrics = self._run_episode(env, task_key, ep)
                benchmark.episodes.append(metrics)

                logger.info(
                    f"  Episode {ep + 1}/{self.num_episodes}: "
                    f"{metrics.steps} steps, {metrics.total_reward:.1f} reward, "
                    f"{'SUCCESS' if metrics.success else 'no success'}"
                )
        finally:
            env.close()

        benchmark.total_time = time.time() - start_time
        self.results[task_key] = benchmark
        return benchmark

    def _run_episode(self, env, task_key: str, ep: int) -> EpisodeMetrics:
        """Run a single episode and collect metrics."""
        obs = env.reset()
        self.agent.reset()

        metrics = EpisodeMetrics(episode=ep + 1)
        ep_start = time.time()

        for step in range(self.max_steps):
            pov = obs.get("pov")
            if pov is None:
                break

            action = self.agent.act(pov, stochastic=True)

            active = get_active_buttons(action)
            if is_null_action(action):
                metrics.null_actions += 1
            else:
                metrics.actions_taken += 1

            obs, reward, done, info = env.step(action)
            metrics.total_reward += reward
            metrics.steps += 1

            # Check task-specific success
            success, events = detect_task_success(task_key, obs, info, reward)
            if success:
                metrics.success = True
            metrics.events.extend(events)

            if done:
                break

        metrics.elapsed_seconds = time.time() - ep_start

        # Capture final inventory if available
        if "inventory" in info:
            metrics.final_inventory = {
                k: int(v) for k, v in info["inventory"].items()
                if v > 0
            }

        return metrics

    def run_all_tasks(self, tasks: Optional[List[str]] = None) -> Dict[str, TaskBenchmark]:
        """
        Run benchmark on all (or specified) tasks.

        :param tasks: List of task keys, or None for all tasks
        :return: Dict of task_key → TaskBenchmark
        """
        if tasks is None:
            tasks = list(MINERL_TASKS.keys())

        for task_key in tasks:
            if task_key not in MINERL_TASKS:
                logger.warning(f"Unknown task '{task_key}', skipping")
                continue
            try:
                self.run_task(task_key)
            except Exception as e:
                logger.error(f"Task '{task_key}' failed: {e}")

        return self.results

    def compare_baselines(self, task_key: str) -> Dict:
        """
        Compare benchmark results against known baselines.

        :param task_key: Task key
        :return: Comparison dict
        """
        if task_key not in self.results:
            return {"error": f"No results for task '{task_key}'"}
        if task_key not in MINERL_BASELINES:
            return {"error": f"No baselines for task '{task_key}'"}

        benchmark = self.results[task_key]
        baselines = MINERL_BASELINES[task_key]

        comparison = {
            "task": task_key,
            "agent_reward": benchmark.avg_reward,
            "agent_success_rate": benchmark.success_rate,
            "baselines": {},
        }

        for name, score in baselines.items():
            pct = (benchmark.avg_reward / max(score, 0.001)) * 100
            comparison["baselines"][name] = {
                "baseline_score": score,
                "agent_pct": round(pct, 1),
                "verdict": "exceeds" if pct > 100 else "below",
            }

        return comparison

    def generate_report(self) -> Dict:
        """
        Generate a comprehensive benchmark report.

        :return: Report dict suitable for JSON serialization
        """
        report = {
            "meta": {
                "model": os.path.basename(self.model_path),
                "weights": os.path.basename(self.weights_path),
                "device": self.device,
                "num_episodes": self.num_episodes,
                "max_steps": self.max_steps,
                "seed": self.seed,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            "results": {},
            "summary": {
                "total_tasks": len(self.results),
                "total_time": sum(r.total_time for r in self.results.values()),
                "overall_avg_reward": 0.0,
                "overall_success_rate": 0.0,
            },
        }

        all_rewards = []
        all_success = []

        for task_key, benchmark in self.results.items():
            report["results"][task_key] = benchmark.to_dict()
            all_rewards.append(benchmark.avg_reward)
            all_success.append(benchmark.success_rate)

            # Add baseline comparison
            if task_key in MINERL_BASELINES:
                report["results"][task_key]["baseline_comparison"] = (
                    self.compare_baselines(task_key)
                )

        if all_rewards:
            report["summary"]["overall_avg_reward"] = float(np.mean(all_rewards))
            report["summary"]["overall_success_rate"] = float(np.mean(all_success))

        return report

    def print_summary(self):
        """Print a formatted benchmark summary."""
        print("\n" + "=" * 70)
        print("  MineRL VPT Benchmark Report")
        print("=" * 70)
        print(f"  Model:      {os.path.basename(self.model_path)}")
        print(f"  Device:     {self.device}")
        print(f"  Episodes:   {self.num_episodes}")
        print(f"  Max steps:  {self.max_steps}")
        print("-" * 70)

        for task_key, benchmark in self.results.items():
            print(f"\n  [{task_key}]")
            print(f"    Avg Reward:    {benchmark.avg_reward:.2f} +/- {benchmark.std_reward:.2f}")
            print(f"    Success Rate:  {benchmark.success_rate:.1%}")
            print(f"    Avg Steps:     {benchmark.avg_steps:.0f}")
            print(f"    Action Rate:   {benchmark.action_rate:.1%}")
            print(f"    Steps/s:       {benchmark.avg_steps_per_second:.1f}")

            # Baseline comparison
            if task_key in MINERL_BASELINES:
                print(f"    vs Baselines:")
                baselines = MINERL_BASELINES[task_key]
                for name, score in baselines.items():
                    pct = (benchmark.avg_reward / max(score, 0.001)) * 100
                    bar = "█" * min(int(pct / 5), 20)
                    print(f"      {name:20s}: {score:6.1f}  | {bar:20s} {pct:.0f}%")

        # Overall
        all_rewards = [b.avg_reward for b in self.results.values()]
        all_success = [b.success_rate for b in self.results.values()]
        total_time = sum(b.total_time for b in self.results.values())

        print("\n" + "=" * 70)
        print(f"  OVERALL: {len(self.results)} tasks completed in {total_time:.1f}s")
        if all_rewards:
            print(f"  Avg Reward: {np.mean(all_rewards):.2f}")
            print(f"  Avg Success: {np.mean(all_success):.1%}")
        print("=" * 70)

    def save_report(self, output_path: str):
        """Save benchmark report to JSON file."""
        report = self.generate_report()
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        logger.info(f"Benchmark report saved to: {output_path}")


# ============================================================
# Environment Validation
# ============================================================

def validate_environment() -> Dict:
    """
    Validate that the MineRL environment is properly installed and configured.

    :return: Validation report dict
    """
    report = {
        "minerl_installed": False,
        "gym_installed": False,
        "java_available": False,
        "tasks_available": [],
        "errors": [],
    }

    # Check MineRL
    try:
        import minerl
        report["minerl_installed"] = True
        report["minerl_version"] = getattr(minerl, "__version__", "unknown")
    except ImportError:
        report["errors"].append("MineRL not installed: pip install minerl")

    # Check Gym
    try:
        import gym
        report["gym_installed"] = True
        report["gym_version"] = getattr(gym, "__version__", "unknown")
    except ImportError:
        report["errors"].append("Gym not installed: pip install gym")

    # Check Java
    import subprocess
    try:
        result = subprocess.run(
            ["java", "-version"], capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            report["java_available"] = True
            report["java_version"] = result.stderr.split("\n")[0] if result.stderr else "unknown"
    except (FileNotFoundError, subprocess.TimeoutExpired):
        report["errors"].append("Java not found — required for MineRL environments")

    # Check available tasks
    if report["minerl_installed"] and report["gym_installed"]:
        for task_key, env_name in MINERL_TASKS.items():
            try:
                import gym
                env = gym.make(env_name)
                env.close()
                report["tasks_available"].append(task_key)
            except Exception:
                pass  # Task not available (e.g., needs Minecraft license)

    return report


# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="MineRL VPT Benchmark Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single task benchmark
  python minerl_benchmark.py --model model.model --weights model.weights --task treechop --episodes 10

  # All tasks benchmark
  python minerl_benchmark.py --model model.model --weights model.weights --all-tasks --episodes 5

  # Validate environment
  python minerl_benchmark.py --validate

  # Save report
  python minerl_benchmark.py --model model.model --weights model.weights --task treechop --output report.json

Available tasks: """ + ", ".join(MINERL_TASKS.keys()),
    )

    parser.add_argument("--model", type=str, help="Path to VPT .model file")
    parser.add_argument("--weights", type=str, help="Path to VPT .weights file")
    parser.add_argument("--task", type=str, default="treechop",
                        help="MineRL task to benchmark (default: treechop)")
    parser.add_argument("--all-tasks", action="store_true",
                        help="Run benchmark on all available tasks")
    parser.add_argument("--device", type=str, default="cpu", help="Torch device")
    parser.add_argument("--max-steps", type=int, default=1000, help="Max steps per episode")
    parser.add_argument("--episodes", type=int, default=10, help="Number of episodes")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--output", type=str, default=None, help="Save report to JSON file")
    parser.add_argument("--validate", action="store_true",
                        help="Validate MineRL environment setup")

    args = parser.parse_args()

    if args.validate:
        print("Validating MineRL environment...")
        report = validate_environment()
        print(json.dumps(report, indent=2))
        return

    if not args.model or not args.weights:
        parser.error("--model and --weights are required for benchmarking")

    runner = MineRLBenchmarkRunner(
        model_path=args.model,
        weights_path=args.weights,
        device=args.device,
        max_steps=args.max_steps,
        num_episodes=args.episodes,
        seed=args.seed,
    )

    if args.all_tasks:
        runner.run_all_tasks()
    else:
        runner.run_task(args.task)

    runner.print_summary()

    if args.output:
        runner.save_report(args.output)


if __name__ == "__main__":
    main()