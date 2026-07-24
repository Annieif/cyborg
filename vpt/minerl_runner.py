"""
MineRL Environment Runner — Run VPT models in MineRL for offline testing.

Provides a test harness for running VPT models in the MineRL environment
without needing the Mineflayer bot or a real Minecraft server.

Usage:
    python minerl_runner.py --model foundation-model-1x.model --weights foundation-model-1x.weights --task treechop

Reference:
  - https://minerl.readthedocs.io/
  - https://github.com/openai/Video-Pre-Training
"""

import os
import sys
import argparse
import time
import json
import logging
from typing import Optional, Dict, List

import numpy as np
import cv2

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("minerl-runner")

# Add VPT lib/ to path if available
vpt_lib_path = os.path.join(os.path.dirname(__file__), "lib")
if os.path.exists(vpt_lib_path):
    sys.path.insert(0, os.path.dirname(__file__))

from vpt_agent import VPTAgent
from minerl_actions import (
    MINERL_TASKS, MINERL_ENV_KWARGS,
    get_active_buttons, is_null_action, create_noop,
)


class MineRLRunner:
    """
    Runs VPT models in MineRL environments for offline testing and evaluation.

    This runner does NOT require a Minecraft server or Mineflayer bot.
    It directly launches the MineRL gym environment and feeds VPT predictions.

    :param model_path: Path to VPT .model file
    :param weights_path: Path to VPT .weights file
    :param task: MineRL task name (e.g., 'treechop', 'navigate', 'diamond')
    :param device: Torch device ('cpu', 'cuda', 'cuda:0')
    :param headless: Whether to run without rendering
    :param max_steps: Maximum steps per episode
    :param num_episodes: Number of episodes to run
    """

    def __init__(
        self,
        model_path: str,
        weights_path: str,
        task: str = "treechop",
        device: str = "cpu",
        headless: bool = True,
        max_steps: int = 1000,
        num_episodes: int = 1,
    ):
        self.model_path = model_path
        self.weights_path = weights_path
        self.task_key = task
        self.device = device
        self.headless = headless
        self.max_steps = max_steps
        self.num_episodes = num_episodes

        self.agent: Optional[VPTAgent] = None
        self.env = None
        self.stats: List[Dict] = []

    def init_env(self):
        """Initialize the MineRL environment."""
        try:
            import gym
            import minerl  # noqa: F401 — registers MineRL environments
        except ImportError as e:
            logger.error(f"MineRL not installed: {e}")
            logger.error("Install with: pip install minerl")
            sys.exit(1)

        # Resolve task name
        env_name = MINERL_TASKS.get(self.task_key, self.task_key)
        logger.info(f"Creating MineRL environment: {env_name}")

        try:
            self.env = gym.make(env_name)
        except Exception as e:
            logger.error(f"Failed to create MineRL environment '{env_name}': {e}")
            logger.info("Make sure you have a valid Minecraft license and Java 8+ installed.")
            logger.info("Available tasks: " + ", ".join(MINERL_TASKS.keys()))
            sys.exit(1)

        logger.info(f"Action space: {list(self.env.action_space.spaces.keys())}")
        logger.info(f"Observation space: {list(self.env.observation_space.spaces.keys())}")

    def init_agent(self):
        """Initialize the VPT agent."""
        logger.info(f"Loading VPT model from {self.model_path}")
        self.agent = VPTAgent(
            model_path=self.model_path,
            weights_path=self.weights_path,
            device=self.device,
        )
        logger.info("VPT agent loaded successfully")

    def run_episode(self, episode: int) -> Dict:
        """
        Run a single episode.

        :param episode: Episode number
        :return: Episode statistics
        """
        logger.info(f"=== Episode {episode + 1}/{self.num_episodes} ===")

        obs = self.env.reset()
        self.agent.reset()

        total_reward = 0.0
        step_count = 0
        action_count = 0
        null_count = 0
        episode_actions: List[str] = []

        start_time = time.time()

        for step in range(self.max_steps):
            # Get VPT prediction from POV image
            pov = obs.get("pov")
            if pov is None:
                logger.warning("No POV in observation, skipping step")
                break

            action = self.agent.act(pov, stochastic=True)

            # Track statistics
            active_buttons = get_active_buttons(action)
            if is_null_action(action):
                null_count += 1
            else:
                action_count += 1
                if active_buttons:
                    episode_actions.append(active_buttons[0])

            # Step environment
            obs, reward, done, info = self.env.step(action)
            total_reward += reward
            step_count += 1

            # Render if not headless
            if not self.headless:
                self.env.render()

            if done:
                logger.info(f"Episode ended at step {step + 1}, reward: {total_reward:.2f}")
                break

        elapsed = time.time() - start_time

        stats = {
            "episode": episode + 1,
            "steps": step_count,
            "total_reward": float(total_reward),
            "actions_taken": action_count,
            "null_actions": null_count,
            "action_rate": action_count / max(step_count, 1),
            "elapsed_seconds": elapsed,
            "steps_per_second": step_count / max(elapsed, 0.001),
            "top_actions": self._top_actions(episode_actions, 5),
        }

        self.stats.append(stats)
        logger.info(
            f"Episode {episode + 1} complete: "
            f"{step_count} steps, {total_reward:.1f} reward, "
            f"{stats['steps_per_second']:.1f} steps/s"
        )
        return stats

    def _top_actions(self, actions: List[str], n: int = 5) -> List[tuple]:
        """Get top N most frequent actions."""
        from collections import Counter
        return Counter(actions).most_common(n)

    def run(self):
        """Run all episodes."""
        self.init_env()
        self.init_agent()

        try:
            for ep in range(self.num_episodes):
                self.run_episode(ep)
        finally:
            self.env.close()

        self.print_summary()
        return self.stats

    def print_summary(self):
        """Print summary statistics across all episodes."""
        if not self.stats:
            return

        print("\n" + "=" * 60)
        print("  MineRL VPT Benchmark Summary")
        print("=" * 60)

        total_steps = sum(s["steps"] for s in self.stats)
        total_reward = sum(s["total_reward"] for s in self.stats)
        total_actions = sum(s["actions_taken"] for s in self.stats)
        total_time = sum(s["elapsed_seconds"] for s in self.stats)

        print(f"  Task:        {self.task_key}")
        print(f"  Episodes:    {len(self.stats)}")
        print(f"  Total steps: {total_steps}")
        print(f"  Avg reward:  {total_reward / len(self.stats):.2f}")
        print(f"  Action rate: {total_actions / max(total_steps, 1):.1%}")
        print(f"  Total time:  {total_time:.1f}s")
        print(f"  Avg steps/s: {total_steps / max(total_time, 0.001):.1f}")
        print("=" * 60)

    def save_results(self, output_path: str):
        """Save benchmark results to JSON."""
        summary = {
            "task": self.task_key,
            "model": os.path.basename(self.model_path),
            "weights": os.path.basename(self.weights_path),
            "device": self.device,
            "episodes": self.stats,
            "aggregate": {
                "total_steps": sum(s["steps"] for s in self.stats),
                "avg_reward": sum(s["total_reward"] for s in self.stats) / len(self.stats),
                "total_time": sum(s["elapsed_seconds"] for s in self.stats),
            },
        }
        with open(output_path, "w") as f:
            json.dump(summary, f, indent=2)
        logger.info(f"Results saved to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="MineRL VPT Benchmark Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python minerl_runner.py --model model.model --weights model.weights --task treechop
  python minerl_runner.py --model model.model --weights model.weights --task navigate --episodes 5
  python minerl_runner.py --model model.model --weights model.weights --task diamond --max-steps 5000

Available tasks: """ + ", ".join(MINERL_TASKS.keys()),
    )
    parser.add_argument("--model", type=str, required=True, help="Path to VPT .model file")
    parser.add_argument("--weights", type=str, required=True, help="Path to VPT .weights file")
    parser.add_argument("--task", type=str, default="treechop",
                        help=f"MineRL task name (default: treechop)")
    parser.add_argument("--device", type=str, default="cpu", help="Torch device")
    parser.add_argument("--max-steps", type=int, default=1000, help="Max steps per episode")
    parser.add_argument("--episodes", type=int, default=1, help="Number of episodes")
    parser.add_argument("--output", type=str, default=None, help="Save results to JSON file")
    parser.add_argument("--no-headless", action="store_true", help="Render the game window")

    args = parser.parse_args()

    runner = MineRLRunner(
        model_path=args.model,
        weights_path=args.weights,
        task=args.task,
        device=args.device,
        headless=not args.no_headless,
        max_steps=args.max_steps,
        num_episodes=args.episodes,
    )

    runner.run()

    if args.output:
        runner.save_results(args.output)


if __name__ == "__main__":
    main()